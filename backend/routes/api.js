// Instead of executing queries on the frontend, we will execute some of them in the backend.
import cors from 'cors'
import express from 'express'
import { Call, Function } from 'faunadb'

import {
  handleLoginError,
  handleLogoutError,
  handleRefreshError,
  handleRegisterError,
  handleResetError,
  handleVerificationError
} from './api-errors'
import { sendPasswordResetEmail, sendAccountVerificationEmail } from './../util/emails'
import {
  resetExpressSession,
  setExpressSession,
  getClient,
  setAccountExpressSession
} from './api-helpers'

const router = express.Router()
const corsOptions = {
  origin: process.env.FRONTEND_DOMAIN,
  methods: ['POST'],
  optionsSuccessStatus: 200,
  credentials: true,
  allowedHeaders: ['Content-Type, Set-Cookie, *'],
  maxAge: 86400 * 1000 // 24 hours, increase along with the refresh token if longer sessions are desired .
}

router.use(cors(corsOptions))

// **** Login *****
router.post('/login', function(req, res, next) {
  res.status(200)
  const client = getClient(process.env.BOOTSTRAP_KEY)

  const { email, password } = req.body
  return client
    .query(Call(Function('login'), email, password))
    .then(faunaRes => {
      // Either we return a custom error
      if (faunaRes.code) {
        return res.json(faunaRes)
      }
      // Or simply fail if false
      else if (!faunaRes) {
        return res.json(faunaRes)
      }
      // Or we succeed with the login and can receive a set of tokens.
      else {
        // Set the refreshToken in the httpOnly cookie.

        setExpressSession(req, faunaRes)

        // Then we send the ACCESS token to the frontend to be kept in memory (this also needs to happen over https in a production app)
        // To make sure that the frontend can talk to FaunaDB directly. The ACCESS token is short-lived.
        const result = {
          account: faunaRes.account,
          secret: faunaRes.tokens.access.secret,
          sessionLifetime: faunaRes.accessTokenLifetimeSeconds
        }
        return res.json(result)
      }
    })
    .catch(err => handleLoginError(err, res))
})

// **** Register *****

router.post('/register', function(req, res, next) {
  res.status(200)
  const client = getClient(process.env.BOOTSTRAP_KEY)

  const { email, password } = req.body

  return client
    .query(Call('register_with_verification', email, password))
    .then(faunaRes => {
      sendAccountVerificationEmail(email, faunaRes.verificationToken.secret)
      return res.json(faunaRes)
    })
    .catch(err => handleRegisterError(err, res))
})

// **** Refresh *****
router.post('/refresh', function(req, res, next) {
  res.status(200)

  const client = getClient(req.session.refreshToken)

  const attemptRefresh = () => {
    return client.query(Call(Function('refresh'))).then(faunaRes => {
      refreshHandler(faunaRes)
    })
  }

  const refreshHandler = faunaRes => {
    if (faunaRes.code) {
      handleRefreshError(faunaRes, res)
    } else {
      setExpressSession(req, faunaRes)
      return res.json({
        secret: faunaRes.tokens.access.secret,
        account: faunaRes.account,
        sessionLifetime: faunaRes.accessTokenLifetimeSeconds
      })
    }
  }

  if (req.session.accessToken) {
    var ageSeconds = (new Date().getTime() - new Date(req.session.created).getTime()) / 1000
    if (ageSeconds < req.session.accessTokenLifetimeSeconds / 2) {
      console.log('INFO - Session - There is an active session with still valid token')
      return res.json({
        secret: req.session.accessToken,
        account: { data: req.session.account },
        sessionLifetime: req.session.accessTokenLifetimeSeconds
      })
    } else {
      console.log('INFO - Session - Access token is too old, refreshing')
      return attemptRefresh().catch(err => handleRefreshError(err, res))
    }
  } else {
    console.log('INFO - Session - there is no session active, cant refresh')
    res.json({ error: 'no session' })
  }
})

// **** Logout *****
router.post('/logout', async function(req, res) {
  res.status(200)

  const logoutAllTokens = req.body.all
  // Refresh tokens are linked to sessions.
  // let's also invalidate the refreshToken with the same logout function.
  // Since we use a different client with a different token it will act on
  // all refresh tokens that are linked to that sesion.
  try {
    const refreshToken = req.session.refreshToken
    if (refreshToken) {
      const client = getClient(refreshToken)
      if (logoutAllTokens) {
        await client
          .query(Call(Function('logout'), true))
          .catch(err => handleLogoutError(err, true))
      } else {
        await client
          .query(Call(Function('logout'), false))
          .catch(err => handleLogoutError(err, true))
      }
    }
    resetExpressSession(req)
    return res.json({ logout: true })
  } catch (error) {
    console.error('Error logging out', error)
    return res.json({ error: 'could not log out' })
  }
})

// **** Verify *****
router.post('/accounts/verify', async function(req, res) {
  res.status(200)
  const client = getClient(process.env.BOOTSTRAP_KEY)

  try {
    if (req.body.email) {
      // create verification request
      const { email } = req.body

      const faunaRes = await client.query(Call('get_account_verification_token_by_email', email))
      if (faunaRes) {
        sendAccountVerificationEmail(email, faunaRes.secret)
      }
      // provide no information to the enduser unless on internal errors.
      return res.json(true).catch(err => handleVerificationError(err, res))
    } else {
      // verify an already started verification request
      const { token } = req.body
      const verificationClient = getClient(token)
      const faunaRes = await verificationClient.query(Call('verify_account'))
      setAccountExpressSession(req, faunaRes)
      return res.json(faunaRes)
    }
  } catch (error) {
    return handleVerificationError(error)
  }
})

// **** Reset *****
router.post('/accounts/password/reset', function(req, res, next) {
  res.status(200)
  // if there is an email parameter we are initiating the request.
  requestPasswordReset(req, res)
})

function requestPasswordReset(req, res) {
  const { email } = req.body
  const client = getClient(process.env.BOOTSTRAP_KEY)
  return client
    .query(Call(Function('request_password_reset'), email))
    .then(faunaRes => {
      sendPasswordResetEmail(email, faunaRes.secret)
      return res.json({ ok: true })
    })
    .catch(err => handleResetError(err, res))
}

module.exports = router

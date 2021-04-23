// Instead of executing queries on the frontend, we will execute some of them in the backend.
import cors from 'cors'
import express from 'express'
import fauna from 'faunadb'
import urljoin from 'url-join'

import {
  getRefreshErrorCode,
  handleLoginError,
  handleRegisterError,
  handleResetError
} from './api-errors'
import { refreshTokenUsed } from '../../fauna-queries/helpers/errors'
import { sendPasswordResetEmail, sendAccountVerificationEmail } from './../util/emails'
import { resetExpressSession, setExpressSession } from './api-helpers'

const q = fauna.query
const { Call } = q

const router = express.Router()
const corsOptions = {
  origin: process.env.FRONTEND_DOMAIN,
  methods: ['POST'],
  optionsSuccessStatus: 200,
  credentials: true,
  allowedHeaders: ['Content-Type, Set-Cookie, *'],
  maxAge: 600
}

router.use(cors(corsOptions))

// **** Login *****
router.post('/login', function(req, res, next) {
  res.status(200)
  const client = new fauna.Client({
    secret: process.env.BOOTSTRAP_KEY
  })

  const { email, password } = req.body
  return client
    .query(Call(q.Function('login'), email, password))
    .then(faunaRes => {
      // Either we return a custom error
      if (faunaRes.code) {
        return res.json(faunaRes)
      }
      // Or we succeed with the login and can receive a set of tokens.
      else {
        // Set the refreshToken in the httpOnly cookie.
        req.session.refreshToken = faunaRes.tokens.refresh.secret
        req.session.accessToken = faunaRes.tokens.access.secret
        req.session.account = faunaRes.account
        // Then we send the ACCESS token to the frontend to be kept in memory (this also needs to happen over https in a production app)
        // To make sure that the frontend can talk to FaunaDB directly. The ACCESS token is short-lived.
        const result = { account: faunaRes.account, secret: faunaRes.tokens.access.secret }
        return res.json(result)
      }
    })
    .catch(err => handleLoginError(err, res))
})

// **** Register *****

router.post('/register', function(req, res, next) {
  res.status(200)
  const client = new fauna.Client({
    secret: process.env.BOOTSTRAP_KEY
  })

  const { email, password } = req.body

  return client
    .query(Call('register_with_verification', email, password))
    .then(faunaRes => {
      const environment = process.argv[2]
      // If environment is anything but production we use mailtrap to 'fake' sending e-mails.
      if (environment !== 'prod') {
        sendAccountVerificationEmail(email, faunaRes.verificationToken.secret)
      } else {
        // In production, use a real e-mail service.
        // There are many options to implement e-mailing, each of them are a bit cumbersome
        // for a local setup since they need to make sure that users don't use their services
        // to send spam e-mails. This is outside of the scope of this article but you have the choice of:
        // Nodemailer (with gmail or anything like that), Mailgun, SparkPost, or Amazon SES, Mandrill, Twilio SendGrid.
        // .... < your implementation > ....
      }
      return res.json(faunaRes)
    })
    .catch(err => handleRegisterError(err, res))
})

// **** Refresh *****
router.post('/refresh', function(req, res, next) {
  res.status(200)
  const client = new fauna.Client({
    secret: req.session.refreshToken
  })
  // First verify whether there is an accessToken.
  // If there is, we'll try to refresh it
  // (the refresh token has permissions to verify the acces token)
  const refreshHandler = faunaRes => {
    if (faunaRes.error && faunaRes.error === refreshTokenUsed) {
      resetExpressSession(req)
      return res.status(200).send({ error: refreshTokenUsed })
    } else {
      setExpressSession(req, faunaRes)
      return res.json({ secret: faunaRes.access.secret, account: faunaRes.account })
    }
  }

  if (req.session.accessToken) {
    console.log('INFO: verifying access token')
    return client
      .query(Call(q.Function('refresh_token')))
      .then(faunaRes => {
        refreshHandler(faunaRes)
      })
      .catch(err => {
        const refreshErrorCode = getRefreshErrorCode(err)
        if (refreshErrorCode === 'instance not found') {
          client
            .query(Call(q.Function('refresh_token')))
            .then(faunaRes => {
              refreshHandler(faunaRes)
            })
            .catch(err => {
              console.log('refresh failed', err)
            })
        } else {
          return res.json({ error: 'could not verify token' })
        }
      })
  } else {
    console.log('INFO - Session - there is no session active, cant refresh')
    res.json({ error: 'no session' })
  }
})

// **** Logout *****
router.post('/logout', async function(req, res) {
  res.status(200)

  const logoutAllTokens = req.query.all

  // Refresh tokens are linked to sessions.
  // let's also invalidate the refreshToken with the same logout function.
  // Since we use a different client with a different token it will act on
  // all refresh tokens that are linked to that sesion.
  try {
    const refreshToken = req.session.refreshToken
    if (refreshToken) {
      const client = new fauna.Client({
        secret: refreshToken
      })
      let res = null
      if (logoutAllTokens) {
        res = await client
          .query(Call(q.Function('logout', true)))
          .catch(err => console.log('Error logging out all sessions (access and refresh)', err))
      } else {
        res = await client
          .query(Call(q.Function('logout', false)))
          .catch(err => console.log('Error logging out current session (access and refresh)', err))
      }
      console.log('logout result', JSON.stringify(res, null, 2))
    }
    resetExpressSession(req)
    return res.json({ logout: true })
  } catch (error) {
    console.error('Error logging out', error)
    return res.json({ error: 'could not log out' })
  }
})

// **** Reset *****
router.post('/accounts/password/reset', function(req, res, next) {
  res.status(200)
  // if there is an email parameter we are initiating the request.
  if (req.body.email) {
    requestPasswordReset(req, res)
  } else {
    executePasswordReset(req, res)
  }
})

function requestPasswordReset(req, res) {
  const { email } = req.body
  const client = new fauna.Client({
    secret: process.env.BOOTSTRAP_KEY
  })
  return client
    .query(Call(q.Function('request_reset'), email))
    .then(faunaRes => {
      const environment = process.argv[2]
      // If environment is anything but production we use mailtrap to 'fake' sending e-mails.
      if (environment !== 'prod') {
        sendPasswordResetEmail(email, faunaRes.secret)
      } else {
        // In production, use a real e-mail service such as
        // Nodemailer , Mailgun, SparkPost, or Amazon SES, Mandrill, Twilio SendGrid.
        // .... < your implementation > ....
      }
      return res.json({ ok: true })
    })
    .catch(err => handleResetError(err, res))
}

function executePasswordReset(req, res) {
  const { password, token } = req.body
  const client = new fauna.Client({
    secret: token
  })

  return client
    .query(Call('change_password', password))
    .then(faunaRes => {
      res.status(200)
      res.redirect(urljoin(process.env.FRONTEND_DOMAIN, 'accounts/login'))
    })
    .catch(err => {
      console.error(err)
      return res.json({ error: 'could not reset password' })
    })
}

module.exports = router

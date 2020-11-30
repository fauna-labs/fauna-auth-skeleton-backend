// Instead of executing queries on the frontend, we will execute some of them in the backend.
import cors from 'cors'
import express from 'express'
import faunadb from 'faunadb'
import urljoin from 'url-join'

import { getRefreshErrorCode, handleLoginError, handleRegisterError, handleResetError } from './api-errors'
import { refreshTokenUsed } from '../../fauna-queries/helpers/errors'
import { sendPasswordResetEmail, sendAccountVerificationEmail } from './../util/emails'
import { VerifyRegisteredAccount } from '../../fauna-queries/queries/auth-register'
import { ChangePassword } from '../../fauna-queries/queries/auth-reset'
import { resetExpressSession, setExpressSession } from './api-helpers'

const q = faunadb.query
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

// **** Login *****
router.options('/accounts/login', cors(corsOptions))
router.post('/accounts/login', cors(corsOptions), function(req, res, next) {
  res.status(200)
  const client = new faunadb.Client({
    secret: process.env.BOOTSTRAP_KEY
  })

  const { email, password } = req.body
  return client
    .query(Call(q.Function('login'), email, password))
    .then(faunaRes => {
      // Set the refreshToken in the httpOnly cookie.
      req.session.refreshToken = faunaRes.refresh.secret
      req.session.accessToken = faunaRes.access.secret
      req.session.account = faunaRes.account
      // Then we send the ACCESS token to the frontend to be kept in memory (this also needs to happen over https in a production app)
      // To make sure that the frontend can talk to FaunaDB directly. The ACCESS token is short-lived.
      const result = { account: faunaRes.account, secret: faunaRes.access.secret }
      return res.json(result)
    })
    .catch(err => handleLoginError(err, res))
})

// **** Register *****

router.options('/accounts/register', cors(corsOptions))
router.post('/accounts/register', cors(corsOptions), function(req, res, next) {
  res.status(200)
  const client = new faunadb.Client({
    secret: process.env.BOOTSTRAP_KEY
  })

  const { email, password } = req.body

  return client
    .query(Call(q.Function('register'), email, password))
    .then(faunaRes => {
      const environment = process.argv[2]
      // If environment is anything but production we use mailtrap to 'fake' sending e-mails.
      if (environment !== 'prod') {
        sendAccountVerificationEmail(email, faunaRes.verifyToken.secret)
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
router.options('/accounts/refresh', cors(corsOptions))
router.post('/accounts/refresh', cors(corsOptions), function(req, res, next) {
  res.status(200)
  const client = new faunadb.Client({
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
      .query(Call(q.Function('verify_token'), req.session.accessToken))
      .then(faunaRes => {
        // If the result is true, the token is still valid.
        if (faunaRes === true) {
          console.log('INFO: access token is valid')
          // since it's still valid we'll just return it to the frontend.
          return res.json({ secret: req.session.accessToken, account: req.session.account })
        } else {
          console.log('INFO: invalid, refreshing token')
          client.query(Call(q.Function('refresh_token'))).then(faunaRes => {
            refreshHandler(faunaRes)
          })
        }
        // Else it will receive a new token (if the refresh token was still valid)
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
router.options('/accounts/logout', cors(corsOptions))
router.post('/accounts/logout', cors(corsOptions), async function(req, res) {
  res.status(200)

  const logoutAllTokens = req.query.all

  // Refresh tokens are linked to sessions.
  // let's also invalidate the refreshToken with the same logout function.
  // Since we use a different client with a different token it will act on
  // all refresh tokens that are linked to that sesion.
  try {
    const refreshToken = req.session.refreshToken
    if (refreshToken) {
      const client = new faunadb.Client({
        secret: refreshToken
      })
      let res = null
      if (logoutAllTokens) {
        res = await client
          .query(Call(q.Function('logout_all')))
          .catch(err => console.log('Error logging out all sessions (access and refresh)', err))
      } else {
        res = await client
          .query(Call(q.Function('logout')))
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
router.options('/accounts/reset', cors(corsOptions))
router.post('/accounts/reset', cors(corsOptions), function(req, res, next) {
  res.status(200)
  const client = new faunadb.Client({
    secret: process.env.BOOTSTRAP_KEY
  })
  const { email } = req.body

  return client
    .query(Call(q.Function('request_reset'), email))
    .then(faunaRes => {
      const environment = process.argv[2]
      // If environment is anything but production we use mailtrap to 'fake' sending e-mails.
      if (environment !== 'prod') {
        sendPasswordResetEmail(email, faunaRes.secret)
      } else {
        // In production, use a real e-mail service.
        // There are many options to implement e-mailing, each of them are a bit cumbersome
        // for a local setup since they need to make sure that users don't use their services
        // to send spam e-mails. This is outside of the scope of this article but you have the choice of:
        // Nodemailer (with gmail or anything like that), Mailgun, SparkPost, or Amazon SES, Mandrill, Twilio SendGrid.
        // .... < your implementation > ....
      }
      // we just send 'ok' back, no information on whether an email was found.
      return res.json({ ok: true })
    })
    .catch(err => handleResetError(err, res))
})

// **** Verify an e-mail verification token *****
router.options('/accounts/confirm/:verifytoken', cors(corsOptions))
router.get('/accounts/confirm/:verifytoken', cors(corsOptions), function(req, res, next) {
  const token = req.params.verifytoken
  // This token and therefore this client can only access an account
  // to which this token belongs and the only thing it can do is verify it.
  const client = new faunadb.Client({
    secret: token
  })
  client
    .query(VerifyRegisteredAccount())
    .then(faunaRes => {
      res.status(200)
      res.redirect(urljoin(process.env.FRONTEND_DOMAIN, 'accounts/login'))
    })
    .catch(err => {
      console.error(err)
      res.redirect(urljoin(process.env.FRONTEND_DOMAIN, 'accounts/login', '?error=Could not verify email'))
    })
})

router.options('/accounts/password/', cors(corsOptions))
router.post('/accounts/password/', cors(corsOptions), function(req, res, next) {
  const { password, token } = req.body
  const client = new faunadb.Client({
    secret: token
  })
  // we will use the token here which is the password reset token.
  // the only thing it ca  accounts/logout

  client
    .query(ChangePassword(password))
    .then(faunaRes => {
      res.status(200)
      res.redirect(urljoin(process.env.FRONTEND_DOMAIN, 'accounts/login'))
    })
    .catch(err => {
      console.error(err)
      return res.json({ error: 'could not reset password' })
    })
  // This token and therefore this client can only access an account
  // to which this token belongs and the only thing it can do is reset it with a new password.
  // we will send this to the frontend which has to happen over https! For more information on good reset flows read:
  // https://www.troyhunt.com/everything-you-ever-wanted-to-know/

  // we'll send this token in the query parameters (there might be better ways as this will store it in your
  // browsers history as well which ain't great) but will make sure the token is 1 time use only and
  // that the token is invalidated after 1 hour.
  // res.redirect(urljoin(process.env.FRONTEND_DOMAIN, `accounts/reset?token=${token}`))
})

module.exports = router

// Instead of executing queries on the frontend, we will execute some of them in the backend.
import cors from 'cors'
import express from 'express'
import faunadb from 'faunadb'
import urljoin from 'url-join'

import { HandleLoginError, HandleRegisterError } from './api-errors'
import { refreshTokenUsed, safeVerifyError } from '../../fauna-queries/helpers/errors'
import { sendMailTrapEmail } from './../util/emails'
import { VerifyRegisteredAccount } from '../../fauna-queries/queries/auth-register'

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
    .catch(err => HandleLoginError(err, res))
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
        sendMailTrapEmail(email, faunaRes.verifyToken.secret)
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
    .catch(err => HandleRegisterError(err, res))
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
      req.session.refreshToken = null
      req.session.accessToken = null
      req.session.account = null
      req.session.destroy()
      return res.status(200).send({ error: refreshTokenUsed })
    } else {
      req.session.refreshToken = faunaRes.refresh.secret
      req.session.accessToken = faunaRes.access.secret
      req.session.account = faunaRes.account
      return res.json({ secret: faunaRes.access.secret, account: faunaRes.account })
    }
  }

  if (req.session.accessToken) {
    console.log('INFO: verifying access token')

    return (
      client
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
        // Or return an error if the refresh token was no longer valid or doesn't exist
        // If you wonder why we did not write this as one FQL function: KeyFromSecret which i
        // is used in verify_token Aborts in case the token is not there, which requires us to
        // handle that abort in a different call.
        .catch(err => {
          const errorReason = safeVerifyError(err, [
            'requestResult',
            'responseContent',
            'errors', // The errors of the call
            0,
            'cause',
            0,
            'code'
          ])
          // 'instance not found' is what 'KeyFromSecret' will return if you no longer have access
          // to the access token
          if (errorReason === 'instance not found') {
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
    )
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
    req.session.refreshToken = null
    req.session.accessToken = null
    req.session.account = null
    req.session.destroy()
    return res.json({ logout: true })
  } catch (error) {
    console.error('Error logging out', error)
    return res.json({ error: 'could not log out' })
  }
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

module.exports = router

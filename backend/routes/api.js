// Instead of executing queries on the frontend, we will execute some of them in the backend.
import cors from 'cors'
import express from 'express'
import faunadb from 'faunadb'

import { HandleLoginError, HandleRegisterError } from './api-errors'

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
      return res.json(faunaRes)
    })
    .catch(err => HandleRegisterError(err, res))
})

// **** Refresh *****
router.options('/accounts/refresh', cors(corsOptions))
router.post('/accounts/refresh', cors(corsOptions), function(req, res, next) {
  res.status(200)
  if (req.session.refreshToken) {
    console.log('INFO - Session - found an active session, trying to refresh using refresh token')
    const client = new faunadb.Client({
      secret: req.session.refreshToken
    })
    return client
      .query(Call(q.Function('refresh_token')))
      .then(faunaRes => {
        return res.json({ secret: faunaRes.access.secret, account: faunaRes.account })
      })
      .catch(err => {
        console.log(err)
        return res.json({ error: 'unauthorized' })
      })
  } else {
    console.log('INFO - Session - there is no session active, cant refresh')
    res.json(false)
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
    req.session.destroy()
    return res.json({ logout: true })
  } catch (error) {
    console.error('Error logging out', error)
    return res.json({ error: 'could not log out' })
  }
})

module.exports = router

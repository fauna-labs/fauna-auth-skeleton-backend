import { config } from 'dotenv'
import express from 'express'
import logger from 'morgan'
import session from 'express-session'
import cookieParser from 'cookie-parser'

config({ path: '.env.' + process.argv[2] })
// apiRouter somehow breaks if we write it import style (and change the way it exports the router)
// We won't get through the cors security anymore.
const apiRouter = require('./routes/api')
const app = express()
app.use(cookieParser())
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_DOMAIN)
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

const expiryDate = new Date(Date.now() + 60 * 60 * 24000) // 1 day
app.set('trust proxy', 1) // trust first proxy

app.use(
  session({
    name: 'fauna-app-session',
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    cookie: {
      secure: false, // we should server from https in that case, which requires a certificate.
      httpOnly: true,
      expires: expiryDate
    }
  })
)
app.use('/api', apiRouter)

module.exports = app

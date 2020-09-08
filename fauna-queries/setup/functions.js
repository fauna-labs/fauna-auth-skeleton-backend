import { LogoutAllSessions, LogoutCurrentSession, VerifyAndLogin } from './../queries/auth-login'
import { RegisterAccountWithEmailVerification } from './../queries/auth-register'

import { CreateOrUpdateFunction } from './../helpers/fql'
import { VerifyUserLockedAndRefresh, VerifyUserLockedAndVerifyAccessToken } from '../queries/auth-refresh'

const faunadb = require('faunadb')
const q = faunadb.query
const { Query, Lambda, Role, Var } = q

const RegisterUDF = CreateOrUpdateFunction({
  name: 'register',
  body: Query(Lambda(['email', 'password'], RegisterAccountWithEmailVerification(Var('email'), Var('password')))),
  role: Role('functionrole_register')
})

const LoginUDF = CreateOrUpdateFunction({
  name: 'login',
  body: Query(Lambda(['email', 'password'], VerifyAndLogin(Var('email'), Var('password')))),
  role: Role('functionrole_login')
})

const RefreshTokenUDF = CreateOrUpdateFunction({
  name: 'refresh_token',
  body: Query(Lambda([], VerifyUserLockedAndRefresh())),
  role: Role('functionrole_refresh_tokens_logout_verify')
})

const LogoutAllUDF = CreateOrUpdateFunction({
  name: 'logout_all',
  body: Query(Lambda([], LogoutAllSessions())),
  role: Role('functionrole_refresh_tokens_logout_verify')
})

const LogoutUDF = CreateOrUpdateFunction({
  name: 'logout',
  body: Query(Lambda([], LogoutCurrentSession())),
  role: Role('functionrole_refresh_tokens_logout_verify')
})

const VerifyAccessTokenUDF = CreateOrUpdateFunction({
  name: 'verify_token',
  body: Query(Lambda(['secret'], VerifyUserLockedAndVerifyAccessToken(Var('secret')))),
  role: Role('functionrole_refresh_tokens_logout_verify')
})

export { RegisterUDF, LoginUDF, RefreshTokenUDF, LogoutAllUDF, LogoutUDF, VerifyAccessTokenUDF }

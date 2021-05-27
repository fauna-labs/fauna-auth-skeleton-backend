import { Query, Lambda, CreateFunction, Var, If, Let, Equals, Call, Do } from 'faunadb'
import { LoginAccount, VerifyAccountExists } from '../../../src/login'

const LimitLoginCalls = (enabled, maxFailedLogins) => {
  return If(enabled, Call('call_limit', 'failed_login', Var('email'), maxFailedLogins), false)
}

const ResetLoginCalls = enabled => {
  return If(enabled, Call('reset_access_logs', 'failed_login', Var('email')), false)
}

const LogLogin = (enabled, email, result) => {
  return If(enabled, Call('log', 'auth', 'login', email), false)
}

export default CreateFunction({
  name: 'login',
  body: Query(
    Lambda(
      ['email', 'password'],
      Let(
        {
          maxFailedLogins: Call('config_var', { path: ['rate_limiting', 'failed_logins', 'max'] }),
          rateLimitFailedLogins: Call('config_var', {
            path: ['rate_limiting', 'failed_logins', 'enabled']
          }),
          logLogins: Call('config_var', { path: ['logging', 'login'] })
        },
        Do(
          LimitLoginCalls(Var('rateLimitFailedLogins'), Var('maxFailedLogins')),
          Let(
            {
              loginResult: If(
                VerifyAccountExists(Var('email')),
                LoginAccount(Var('email'), Var('password')),
                // if account does not exist, do not provide further information
                false
              )
            },
            If(
              Equals(Var('loginResult'), false),
              Do(LogLogin(Var('logLogins'), Var('email'), true), false),
              Do(
                LogLogin(Var('logLogins'), Var('email'), true),
                ResetLoginCalls(Var('rateLimitFailedLogins')),
                Var('loginResult')
              )
            )
          )
        )
      )
    )
  ),
  role: 'admin'
})

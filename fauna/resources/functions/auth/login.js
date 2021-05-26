import { Query, Lambda, CreateFunction, Var, If, Let, Equals, Call, Do } from 'faunadb'
import { LoginAccount, VerifyAccountExists } from '../../../src/login'

export default CreateFunction({
  name: 'login',
  body: Query(
    Lambda(
      ['email', 'password'],
      Do(
        Call('call_limit', 'failed_login', 'someemail@emaildomain.com', 3),
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
            false,
            Do(Call('reset_logs', 'failed_login', 'someemail@emaildomain.com'), Var('loginResult'))
          )
        )
      )
    )
  ),
  role: 'admin'
})

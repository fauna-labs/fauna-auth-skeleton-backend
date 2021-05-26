import { Query, Lambda, CreateFunction, Var, If } from 'faunadb'
import { LoginAccount, VerifyAccountExists } from '../../../src/login'

export default CreateFunction({
  name: 'login',
  body: Query(
    Lambda(
      ['email', 'password'],
      If(
        VerifyAccountExists(Var('email')),
        LoginAccount(Var('email'), Var('password')),
        // if account does not exist, do not provide further information
        false
      )
    )
  ),
  role: 'admin'
})

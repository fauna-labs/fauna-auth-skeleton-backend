import fauna from 'faunadb'
import { LoginAccount, VerifyAccountExists } from '../../src/login'

const q = fauna.query
const { Query, Lambda, CreateFunction, Var, If } = q

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

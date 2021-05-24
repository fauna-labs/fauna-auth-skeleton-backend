import fauna from 'faunadb'
import { ACCOUNT_NOT_VERIFIED } from '../../src/anomalies'
import { LoginAccount, VerifyAccountExists } from '../../src/login'

const q = fauna.query
const { Query, Lambda, CreateFunction, Var, If, Call, Abort } = q

export default CreateFunction({
  name: 'login',
  body: Query(
    Lambda(
      ['email', 'password'],
      If(
        VerifyAccountExists(Var('email')),
        If(
          Call('is_verified', Var('email')),
          LoginAccount(Var('email'), Var('password')),
          ACCOUNT_NOT_VERIFIED
        ),
        // if account does not exist, do not provide further information
        false
      )
    )
  ),
  role: 'admin'
})

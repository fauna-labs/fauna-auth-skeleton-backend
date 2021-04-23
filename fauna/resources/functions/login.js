import fauna from 'faunadb'
import { ACCOUNT_NOT_VERIFIED } from '../../src/anomalies'
import { LoginAccount } from '../../src/login'

const q = fauna.query
const { Query, Lambda, CreateFunction, Var, If, Call, Abort } = q

export default CreateFunction({
  name: 'login',
  body: Query(
    Lambda(
      ['email', 'password'],
      If(
        Call('is_verified', Var('email')),
        LoginAccount(Var('email'), Var('password')),
        ACCOUNT_NOT_VERIFIED
      )
    )
  ),
  role: 'admin'
})

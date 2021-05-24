import faunadb from 'faunadb'

import { GetAccountByEmail, VerifyAccountExists } from '../../src/login'

const q = faunadb.query
const { CreateFunction, Query, Lambda, Var, Let, Call, Select, If, And, Not } = q

export default CreateFunction({
  name: 'get_account_verification_token_by_email',
  body: Query(
    Lambda(
      ['email'],
      If(
        And(VerifyAccountExists(Var('email')), Not(Call('is_verified', Var('email')))),
        Let(
          {
            account: GetAccountByEmail(Var('email')),
            accountRef: Select(['ref'], Var('account'))
          },
          Call('get_account_verification_token', Var('accountRef'))
        ),
        false
      )
    )
  ),
  role: 'server'
})

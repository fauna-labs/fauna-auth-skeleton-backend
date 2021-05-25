import faunadb from 'faunadb'
import { ResetPassword } from '../../src/password-reset'

const q = faunadb.query
const { Query, Lambda, CreateFunction, Var, Do, Call } = q

export default CreateFunction({
  name: 'reset_password',
  body: Query(
    Lambda(
      ['password'],
      Do(Call('validate_password', Var('password')), ResetPassword(Var('password')))
    )
  ),
  role: 'server'
})

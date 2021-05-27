import { Query, Lambda, CreateFunction, Var, Do, Call } from 'faunadb'
import { ResetPassword } from '../../../src/password-reset'

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

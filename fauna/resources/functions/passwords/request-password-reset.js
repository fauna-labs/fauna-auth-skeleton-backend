import { Query, Lambda, CreateFunction, Var } from 'faunadb'
import { RequestPasswordReset } from '../../../src/password-reset'

export default CreateFunction({
  name: 'request_password_reset',
  body: Query(Lambda(['email'], RequestPasswordReset(Var('email')))),
  role: 'server'
})

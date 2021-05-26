import { Query, Lambda, CreateFunction, Var } from 'faunadb'
import { Logout } from '../../../src/logout'

export default CreateFunction({
  name: 'logout',
  body: Query(Lambda(['all'], Logout(Var('all')))),
  role: 'server'
})

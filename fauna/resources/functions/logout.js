import fauna from 'faunadb'
import { Logout } from '../../src/logout'

const q = fauna.query
const { Query, Lambda, CreateFunction, Var } = q

export default CreateFunction({
  name: 'logout',
  body: Query(Lambda(['all'], Logout(Var('all')))),
  role: 'server'
})

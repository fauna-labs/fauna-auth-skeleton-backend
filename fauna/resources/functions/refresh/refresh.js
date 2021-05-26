import fauna from 'faunadb'
import { RefreshToken } from '../../../src/refresh'

const q = fauna.query
const { Query, Lambda, CreateFunction } = q

export default CreateFunction({
  name: 'refresh',
  body: Query(Lambda([], RefreshToken())),
  role: 'server'
})

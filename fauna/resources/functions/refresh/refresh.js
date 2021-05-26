import { Query, Lambda, CreateFunction } from 'faunadb'
import { RefreshToken } from '../../../src/refresh'

export default CreateFunction({
  name: 'refresh',
  body: Query(Lambda([], RefreshToken())),
  role: 'server'
})

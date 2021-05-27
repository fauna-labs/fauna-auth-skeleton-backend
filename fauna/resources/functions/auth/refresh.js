import {
  Query,
  Lambda,
  CreateFunction,
  If,
  Call,
  Var,
  Let,
  Do,
  Select,
  Get,
  CurrentIdentity
} from 'faunadb'
import { RefreshToken } from '../../../src/refresh'

const LogRefresh = (enabled, email) => {
  return If(enabled, Call('log', 'auth', 'refresh', email), false)
}

export default CreateFunction({
  name: 'refresh',
  body: Query(
    Lambda(
      [],
      Let(
        {
          logRefresh: Call('config_var', { path: ['logging', 'refresh'] }),
          refreshResult: RefreshToken()
        },
        Do(
          LogRefresh(Var('logRefresh'), Select(['data', 'email'], Get(CurrentIdentity()))),
          Var('refreshResult')
        )
      )
    )
  ),
  role: 'server'
})

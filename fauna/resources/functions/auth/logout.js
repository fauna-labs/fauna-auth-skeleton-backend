import {
  Query,
  Lambda,
  CreateFunction,
  Var,
  Call,
  Let,
  Do,
  If,
  Select,
  Get,
  CurrentIdentity
} from 'faunadb'
import { Logout } from '../../../src/logout'

export default CreateFunction({
  name: 'logout',
  body: Query(
    Lambda(
      ['all'],
      Let(
        {
          logLogouts: Call('config_var', { path: ['logging', 'logout'] })
        },
        Do(
          Logout(Var('all')),
          If(
            Var('logLogouts'),
            Call('log', 'auth', 'logout', Select(['data', 'email'], Get(CurrentIdentity()))),
            false
          )
        )
      )
    )
  ),
  role: 'server'
})

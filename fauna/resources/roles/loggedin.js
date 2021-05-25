import fauna from 'faunadb'
import { IsCalledWithAccessToken } from '../../src/tokens'

const q = fauna.query
const { Query, Lambda, Collection, CreateRole, And, Call, Select, Get, Identity } = q

export default CreateRole({
  name: 'loggedin',
  membership: [
    {
      // The accounts collection gets access
      resource: Collection('accounts'),
      // If the token used is an access token or which we'll use a reusable snippet of FQL
      // returned by 'IsCalledWithAccessToken'
      predicate: Query(
        Lambda(ref =>
          And(
            IsCalledWithAccessToken(),
            Call('is_verified', Select(['data', 'email'], Get(Identity())))
          )
        )
      )
    }
  ],
  privileges: [
    {
      resource: q.Function('get_all_dinos'),
      actions: {
        call: true
      }
    }
  ]
})

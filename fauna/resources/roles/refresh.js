import { Query, Lambda, Collection, CreateRole, Function } from 'faunadb'
import { IsCalledWithRefreshToken } from '../../src/tokens'

export default CreateRole({
  name: 'refresh',
  membership: [
    {
      // The accounts collection gets access
      resource: Collection('accounts'),
      // If the token used is an refresh token
      predicate: Query(Lambda(ref => IsCalledWithRefreshToken()))
    }
  ],
  privileges: [
    // A refresh token can only refresh and there is value in restricting the functionality.
    // If a malicious actro was able to grab a refresh token from the httpOnly cookie due to some vulnerability:
    // - the actor can't retrieve data with it
    // - the actor has to realize he has to exchange it for an access token by calling refresh
    // - his refresh actions will be detected if or when the browser of the real user initiates a refresh.
    // In essence, it reduces the ease of getting long-term access significantly if a refresh token does leak.
    {
      resource: Function('refresh'),
      actions: {
        call: true
      }
    },
    {
      resource: Function('logout'),
      actions: {
        call: true
      }
    }
  ]
})

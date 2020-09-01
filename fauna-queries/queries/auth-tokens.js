import faunadb from 'faunadb'

const q = faunadb.query
const { Let, Var, Create, Select, Tokens, Collection, Now, TimeAdd } = q

function CreateAccessToken(instance, sessionDoc) {
  return Create(Tokens(), {
    instance: instance,
    // A  token is just like a document (everything in FaunaDB is),
    // we can store metadata on the token if we'd like.
    data: {
      // We do not do anything with the type, it's just for readability in case we retrieve a token later on
      type: 'access',
      // We store which refresh token that created the access tokens.
      // That way we can invalidate access tokens that were granted by this refresh token if we'd like.
      session: Select(['ref'], sessionDoc)
    },
    // access tokens live for 10 minutes, which is typically a good livetime for short-lived tokens.
    ttl: TimeAdd(Now(), 10, 'minutes')
  })
}

function CreateRefreshToken(accountRef) {
  return Let(
    {
      session_refresh: Create(Collection('account_sessions'), {
        data: {
          account: accountRef,
          used: false
        }
      })
    },
    {
      token: Create(Tokens(), {
        instance: Select(['ref'], Var('session_refresh')),
        // 8 hours is a good time for refresh tokens.
        ttl: TimeAdd(Now(), 8, 'hour'),
        data: {
          // We do not do anything with the type, it's just for readability in case we retrieve a token later on
          type: 'refresh'
        }
      }),
      session_refresh_doc: Var('session_refresh')
    }
  )
}

function CreateAccessAndRefreshToken(instance) {
  return Let(
    {
      refresh: CreateRefreshToken(instance),
      access: CreateAccessToken(instance, Select(['session_refresh_doc'], Var('refresh')))
    },
    {
      refresh: Select(['token'], Var('refresh')),
      access: Var('access')
    }
  )
}

export { CreateRefreshToken, CreateAccessToken, CreateAccessAndRefreshToken }

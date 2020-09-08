import faunadb from 'faunadb'

const q = faunadb.query
const { Let, Var, Create, Select, Tokens, Collection, Now, TimeAdd, KeyFromSecret, GTE } = q

const ACCESS_TOKEN_LIFETIME_SECONDS = 600 // 10 minutes
const REFRESH_TOKEN_LIFETIME_SECONDS = 28800 // 8 hours

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
    ttl: TimeAdd(Now(), ACCESS_TOKEN_LIFETIME_SECONDS, 'seconds')
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
        ttl: TimeAdd(Now(), REFRESH_TOKEN_LIFETIME_SECONDS, 'seconds'),
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

function CreateEmailVerificationToken(accountRef) {
  return Let(
    {
      // first create a document in a collection specifically provided for email verification tokens.
      // If we create a token in a specific collection, we can more easily control
      // with roles what the token can do.
      verification_request: Create(Collection('accounts_verification_request'), {
        data: {
          account: accountRef
        }
      })
    },
    // Create a token that will provide the permissions of the accounts_verification_request document.
    // The account is linked to it in the document which will be used in the roles to verify the acount.
    Create(Tokens(), {
      instance: Select(['ref'], Var('verification_request'))
    })
  )
}

// We will also verify whether it will still be valid for a while which we can do by using the
// KeyFromSecret function (https://docs.fauna.com/fauna/current/api/fql/functions/keyfromsecret)
// this function will return the document of the secret we passed to it (e.g. the Token or Key itself)
// Since this will also provide us with anything that was stored on the token (remember, tokens are just documents)
// the ttl we can use it to see whether it's still valid. The function is called KeyFromSecret but works
// both on Tokens and Keys.
function VerifyAccessToken(secret) {
  return Let(
    {
      // get the token document, do not get confused, this is different than the instance.
      // this the actual Token() document, that will contain the ttl/instance/hashed secret/.. etc..
      // not the instance document linked to the token.
      token_document: KeyFromSecret(secret),
      ttl: Select(['ttl'], Var('token_document'))
    },
    // And we verify whether the token is still valid.
    // We'll make sure it's valid for a few minutes at least, let's take half of the lifetime of a token
    // (e.g. 5 minutes in this case). Else the client will have to refresh right away.
    GTE(TimeAdd(Var('ttl'), Math.ceil(ACCESS_TOKEN_LIFETIME_SECONDS / 2.0), 'seconds'), Now())
  )
}

export {
  VerifyAccessToken,
  CreateEmailVerificationToken,
  CreateRefreshToken,
  CreateAccessToken,
  CreateAccessAndRefreshToken
}

import {
  Let,
  Var,
  Create,
  Select,
  Tokens,
  Now,
  TimeAdd,
  Equals,
  Get,
  CurrentToken,
  HasCurrentToken,
  Exists,
  Update,
  Match,
  Index,
  NewId,
  Do,
  Delete,
  And,
  GT,
  CurrentIdentity,
  Not,
  If,
  Call
} from 'faunadb'

import {
  LogAnomaly,
  REFRESH_TOKEN_EXPIRED,
  REFRESH_TOKEN_REUSE_ERROR,
  REFRESH_TOKEN_USED_AFTER_LOGOUT
} from './anomalies'

const accessLifetime = Call('config_var', {
  path: ['session', 'access_tokens', 'lifetime_seconds']
})
// lifetome of the token makes the refresh token unusable after this lifetime since
// the code explicitely checks that lifetime before allowing a refresh token to refresh.
const refreshLifetime = Call('config_var', {
  path: ['session', 'refresh_tokens', 'lifetime_seconds']
})
// reclaim time deletes the token which makes it unable to detect leaked tokens.
// which is why it is set rather high.
const refreshReclaimTime = Call('config_var', {
  path: ['session', 'refresh_tokens', 'reclaimtime_seconds']
})
// when a refresh token is refreshed itself, allow a grace period to make sure parallel requests work.
const gracePeriod = Call('config_var', {
  path: ['session', 'refresh_tokens', 'graceperiod_seconds']
})

/********************************************
  Creation of tokens
 ********************************************/
export function CreateAccessToken(accountRef, refreshTokenRef, ttlSeconds) {
  return Create(Tokens(), {
    instance: accountRef,
    // A  token is a document just like everything else in Fauna.
    // We will store extra metadata on the token to identify the token type.
    data: {
      type: 'access',
      // We store which refresh token that created the access tokens which allows us to easily invalidate
      // all access tokens created by a specific refresh token.
      refresh: refreshTokenRef
    },
    // access tokens live for 10 minutes, which is typically a good livetime for short-lived tokens.
    ttl: TimeAdd(Now(), ttlSeconds || accessLifetime, 'seconds')
  })
}

export function CreateRefreshToken(accountRef, lifetimeSeconds, reclaimtimeSeconds) {
  return Create(Tokens(), {
    instance: accountRef,
    data: {
      type: 'refresh',
      used: false,
      sessionId: CreateOrReuseId(),
      validUntil: TimeAdd(Now(), lifetimeSeconds || refreshLifetime, 'seconds'),
      loggedOut: false
    },
    ttl: TimeAdd(Now(), reclaimtimeSeconds || refreshReclaimTime, 'seconds')
  })
}

export function CreateAccessAndRefreshToken(
  instance,
  accessTtlSeconds,
  refreshLifetimeSeconds,
  refreshReclaimtimeSeconds
) {
  return Let(
    {
      refresh: CreateRefreshToken(instance, refreshLifetimeSeconds, refreshReclaimtimeSeconds),
      access: CreateAccessToken(instance, Select(['ref'], Var('refresh')), accessTtlSeconds)
    },
    {
      refresh: Var('refresh'),
      access: Var('access')
    }
  )
}

function CreateOrReuseId() {
  return If(IsCalledWithRefreshToken(), GetSessionId(), NewId())
}

export function GetSessionId() {
  return Select(['data', 'sessionId'], Get(CurrentToken()))
}

export function RotateAccessAndRefreshToken(
  gracePeriodSeconds,
  accessTtlSeconds,
  refreshLifetimeSeconds,
  refreshReclaimtimeSeconds
) {
  return Do(
    InvalidateRefreshToken(CurrentToken(), gracePeriodSeconds),
    CreateAccessAndRefreshToken(
      CurrentIdentity(),
      accessTtlSeconds,
      refreshLifetimeSeconds,
      refreshReclaimtimeSeconds
    )
  )
}

/********************************************
  Verification of tokens and/or verify validity of tokens
 ********************************************/
export function IsCalledWithAccessToken() {
  return And(
    HasCurrentToken(),
    Equals(Select(['data', 'type'], Get(CurrentToken()), false), 'access')
  )
}

export function IsCalledWithRefreshToken() {
  return And(
    HasCurrentToken(),
    Equals(Select(['data', 'type'], Get(CurrentToken()), false), 'refresh')
  )
}

export function VerifyRefreshToken(fqlStatementOnSuccessfulVerification, action) {
  return If(
    And(IsTokenUsed(), Not(IsWithinGracePeriod())),
    LogAnomaly(REFRESH_TOKEN_REUSE_ERROR, action),
    If(
      IsTokenStillValid(),
      If(
        Not(IsTokenLoggedOut()),
        fqlStatementOnSuccessfulVerification,
        LogAnomaly(REFRESH_TOKEN_USED_AFTER_LOGOUT, action)
      ),
      LogAnomaly(REFRESH_TOKEN_EXPIRED, action)
    )
  )
}

export function IsTokenLoggedOut() {
  return Select(['data', 'loggedOut'], Get(CurrentToken()))
}

export function IsTokenUsed() {
  return Select(['data', 'used'], Get(CurrentToken()))
}

export function IsTokenStillValid() {
  return GT(Select(['data', 'validUntil'], Get(CurrentToken())), Now())
}

function IsWithinGracePeriod() {
  return GT(Select(['data', 'gracePeriodUntil'], Get(CurrentToken())), Now())
}

/********************************************
  Invalidate/Delete/Logout of tokens
 ********************************************/
export function InvalidateRefreshToken(refreshTokenRef, gracePeriodSeconds) {
  return Update(refreshTokenRef, {
    data: {
      used: true,
      gracePeriodUntil: TimeAdd(Now(), gracePeriodSeconds || gracePeriod, 'seconds')
    }
  })
}

function InvalidateAccessToken(refreshTokenRef) {
  return If(
    Exists(Match(Index('access_token_by_refresh_token'), refreshTokenRef)),
    Delete(Select(['ref'], Get(Match(Index('access_token_by_refresh_token'), refreshTokenRef)))),
    false
  )
}

function LogoutRefreshToken(refreshTokenRef) {
  return Update(refreshTokenRef, { data: { loggedOut: true } })
}

export function LogoutAccessAndRefreshToken(refreshTokenRef) {
  return Do(InvalidateAccessToken(refreshTokenRef), LogoutRefreshToken(refreshTokenRef))
}

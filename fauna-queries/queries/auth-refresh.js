import faunadb from 'faunadb'
import { CreateAccessAndRefreshToken } from './auth-tokens'
import { refreshTokenUsed } from '../helpers/errors'
import { LogoutAllSessions } from './auth-login'

const q = faunadb.query
const { Let, Get, Var, Select, Identity, ToTime, Divide, TimeDiff, Now, And, Do, GTE, If, Update } = q

/** ~~~~~ RefreshToken ~~~
 * How is it executed?
 *    The only way to execute this is to use the current 'refresh' token which has a role that allows to call this function.
 *    That token is created on the 'account_sesions' collection which contains documents that store information
 *    about the refresh token. It will be used to store whether a session is still valid or not which will allow us to detect whether
 *    a refresh token has leaked (if it's used twice, we are certain that something malicious or strange is going on)
 *    Calling this function is the ONLY thing a refresh token can do. If the refresh token
 *    would have the same rights as an access token, a malicious user could use the refresh token to access data
 *    and never ask a new access token -> we wouldn't detect it.
 *
 * What it does:
 *  1. Detect whether the refresh token is still valid (Determined by an attribute on the document)
 *  2. Create a new access token
 *  3. Invalidate the current refresh token (Not deleting it! Mark it as invalid!)
 *  4. Create a new refresh token (essentially we do refresh token rotation)
 *  5. Return both the access and refresh token.
 */

function RefreshToken() {
  return Let(
    {
      // First get the document that the token is linked with (from the 'accounts_session_refresh' collection )
      session: Get(Identity()),
      used: Select(['data', 'used'], Var('session')),
      // let's build in a grace period for in case two browser tabs refresh at the same time!
      // we'll use the last updated time
      time_used: ToTime(Divide(Select(['ts'], Var('session')), 1000)),
      // Let's define that a user has 10s timewindow to send a duplicate request for refresh token
      // The tradeoff is that if an attacker sends the refresh request within that timeframe he has
      // access to the app for the duration of the refresh token. It's still much better than
      // refresh tokens that stay forever though.
      age_in_ms: TimeDiff(Var('time_used'), Now(), 'milliseconds')
    },
    If(
      And(Var('used'), GTE(Var('age_in_ms'), 10000)),
      // Triggering an Abort stops further execution, we don't want that since our tokens
      // will also not be invalidated, we'll return an error.
      Do(LogoutAllSessions(), { error: refreshTokenUsed }),
      // The return value of Do is the last value.
      Let(
        {
          account: Get(Select(['data', 'account'], Var('session'))),
          newtokens: RotateAccessAndRefreshToken(Var('account'))
        },
        {
          account: Var('account'),
          access: Select(['access'], Var('newtokens')),
          refresh: Select(['refresh'], Var('newtokens'))
        }
      )
    )
  )
}

function InvalidateRefreshToken(sessionRef) {
  // By setting the session's used flag to true
  // we indicate that the session can't be used anymore with a previous refresh token (it would result in a 'refreshTokenUsed' Abort)
  return Update(sessionRef, {
    data: {
      used: true
    }
  })
  // We actually do not invalidate the token itself allowing you to call the refresh function again.
  // if someone does that two times with the same token though, we'll know and we'll lock the account.
}

function RotateAccessAndRefreshToken(account) {
  return Let(
    {
      // Here we have options.:
      // > OPTION 1: Invalidate the access token? yes/no?
      // ------------------------------------------
      // Invalidating access token is a good idea on a refresh, however! It would make it very cumbersome
      // to make your app work on multiple tabs (requiring some kind of browser sync result)
      // Really advanced security library will do such a browser sync. If you do not do that it's
      // very hard to know which access token to invalidate and to make sure we don't log out other tabs by refreshing in
      // one tab. Other security libraries will keep it simple and say: "access tokens are short-lived, it's not necessary to go through that effort"

      // Alternative approach without browser sync, you could opt to catch each failed access in your browser
      // and store the access token in the httpOnly cookie as well on a failed access it does a backend call
      // to get the new access token if there is one (we'll implement this in the next commit)

      // > OPTION 2: Invalidate the Refresh token on refresh? yes/no?
      // ------------------------------------------
      // There is the option to just make another refresh token and not invalidate this one (easy, that was the previous implementation)
      // Some implementations even keep refresh tokens around forever and do not even replace them since they consider httpOnly cookies safe enough
      // to do that. That's not my preferred approach.

      // invalidated: InvalidateAccessTokens(Identity()),
      // 4. Invalidate refresh token
      loggedout: InvalidateRefreshToken(Identity()),
      // 3 and 5. Finally, create a new refresh and access token
      tokens: CreateAccessAndRefreshToken(Select(['ref'], account))
    },
    {
      // 6. return the tokens
      access: Select(['access'], Var('tokens')),
      refresh: Select(['refresh'], Var('tokens'))
    }
  )
}

export { RefreshToken }

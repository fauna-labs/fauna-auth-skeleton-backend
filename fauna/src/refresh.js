import { CurrentIdentity, Get, Call } from 'faunadb'
import { RotateAccessAndRefreshToken, VerifyRefreshToken } from './tokens'

export function RefreshToken(
  gracePeriodSeconds,
  accessTtlSeconds,
  refreshLifetimeSeconds,
  refreshReclaimtimeSeconds
) {
  return VerifyRefreshToken(
    {
      tokens: RotateAccessAndRefreshToken(
        gracePeriodSeconds,
        accessTtlSeconds,
        refreshLifetimeSeconds,
        refreshReclaimtimeSeconds
      ),
      account: Get(CurrentIdentity()),
      accessTokenLifetimeSeconds: Call('config_var', {
        path: ['session', 'access_tokens', 'lifetime_seconds']
      })
    },
    'refresh'
  )
}

import { CurrentIdentity, Get } from 'faunadb'
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
      account: Get(CurrentIdentity())
    },
    'refresh'
  )
}

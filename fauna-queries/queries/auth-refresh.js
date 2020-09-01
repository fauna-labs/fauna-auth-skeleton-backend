import faunadb from 'faunadb'
import { CreateAccessToken } from './auth-tokens'

const q = faunadb.query
const { Let, Get, Var, Select, Identity } = q

function RefreshToken() {
  return Let(
    {
      // First get the document that the token is linked with (from the 'account_sessions' collection )
      session: Get(Identity())
    },
    Let(
      {
        account: Get(Select(['data', 'account'], Var('session'))),
        access: CreateAccessToken(Select(['ref'], Var('account')), Var('session'))
      },
      {
        account: Var('account'),
        access: Var('access')
      }
    )
  )
}

export { RefreshToken }

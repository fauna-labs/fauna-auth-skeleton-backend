import fauna from 'faunadb'
import { CreatePasswordResetToken, InvalidateResetTokens } from './auth-tokens'
const q = fauna.query
const { If, Exists, Let, Match, Index, Var, Select, Paginate, Get, Identity, Update } = q

function RequestPasswordReset(email) {
  return If(
    Exists(Match(Index('accounts_by_email'), email)),
    Let(
      {
        accountRef: Select([0], Paginate(Match(Index('accounts_by_email'), email))),
        invalidate: InvalidateResetTokens(Var('accountRef')),
        token: CreatePasswordResetToken(Var('accountRef'))
      },
      Var('token')
    ),
    false
  )
}

function ChangePassword(password) {
  // The token that is used to change the password belongs to a document from the
  // Collection('accounts_password_reset_request'), therefore the Identity() reference will point to such a doc.
  // When we created the document we saved the account to it.
  return Let(
    {
      resetRequest: Get(Identity()),
      accountRef: Select(['data', 'account'], Var('resetRequest'))
    },
    Update(Var('accountRef'), { credentials: { password: password } })
  )
}

export { RequestPasswordReset, ChangePassword }

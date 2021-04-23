import fauna from 'faunadb'
import { CreateEmailVerificationToken } from './auth-tokens'

const q = fauna.query
const { Create, Collection, Let, Select, Get, Identity, Update, Var, Logout } = q

/* Register - creating a simple account
   any document in the database could be used to register login. In this case 
   we chose to make a collection 'accounts'. Registering then means nothing
   more than creating an account. In our case we'll add credentials to the account
   to make sure we can call the FQL Login function on this account later on.  
 */
function RegisterAccount(email, password) {
  return Create(Collection('accounts'), {
    // credentials is a special field, the contents will never be returned
    // and will be encrypted. { password: ... } is the only format it currently accepts.
    credentials: { password: password },
    // everything you want to store in the document should be scoped under 'data'
    data: {
      email: email
    }
  })
}

/* RegisterAccountWithEmailVerification - creating a simple account
   this time with email verification via the backend. 
 */
function RegisterAccountWithEmailVerification(email, password) {
  return Let(
    {
      account: Create(Collection('accounts'), {
        // credentials is a special field, the contents will never be returned
        // and will be encrypted. { password: ... } is the only format it currently accepts.
        credentials: { password: password },
        // everything you want to store in the document should be scoped under 'data'
        data: {
          email: email
        }
      }),
      verifyToken: CreateEmailVerificationToken(Select(['ref'], Var('account')))
    },
    {
      account: Var('account'),
      verifyToken: Var('verifyToken')
    }
  )
}

/* VerifyRegisteredAccount
  The verification will be called using the verifyToken that was created in the previous function.
  That token has the rights to set an account's verified boolean to true.
  */
function VerifyRegisteredAccount() {
  return Let(
    {
      // Identity is a document from the 'accounts_verification_request' collection
      accountRef: Select(['data', 'account'], Get(Identity())),
      account: Update(Var('accountRef'), {
        data: {
          verified: true
        }
      }),
      // Remove the verification token! Without passing 'true' to Logout
      // only this specific token will be removed.
      logout: Logout(false)
      // We could opt here to delete the verification request as well.
      // however we keep it around for logging purposes.
    },
    Var('account')
  )

  // And of course we want to add rate-limiting first.
  // The rate limiting config for login contains calls: 3 and perSeconds: 0 (see './rate-limiting.js)
  // 0 means that there is no decay, no matter how long you wait you can do maximum 3 calls.
  // But on successful login we clean up the rate-limiting so they only remain on failed logins.
}

export { RegisterAccountWithEmailVerification, RegisterAccount, VerifyRegisteredAccount }

import { CreateOrUpdateRole } from './../helpers/fql'
const faunadb = require('faunadb')
// Use the excellent community-driven library by Eigil
// Since everything is just functions, this is how easy it is to extend FQL

const q = faunadb.query
const { Collection, Index, Tokens, Query, Lambda, Not, Equals, Select, Get, Var } = q

/* The backend will be responsible for the auth flow. We could give it a server key
 * but here we show that we can be far more protective and only give the backend access
 * to what it needs. If your backend is running on an external service and somehow env variables
 * get leaked, there is little that your backend can do (except create new accounts) if it does not know passwords to login.
 */
const CreateBootstrapRoleBackend = CreateOrUpdateRole({
  name: 'keyrole_bootstrap_backend',
  privileges: [
    {
      resource: q.Function('login'),
      actions: { call: true }
    },
    {
      resource: q.Function('register'),
      actions: { call: true }
    }
  ]
})

/* If you want to give anonymous users access to data, you still need
 * to give the frontend access to some kind of public data. This might seem convenient but FaunaDB does not allow you
 *  to just set data public (that means anything besides your app will also be able to access this). The minimum requirement
 * is that your frontend has a key to access that data. Below we create the role to give the frontend access to that public data.
 * There is another way if you prefer (create an anonymous user and create a token for that user)
 */

const CreateBootstrapRoleFrontend = CreateOrUpdateRole({
  name: 'keyrole_bootstrap_frontend',
  privileges: [
    {
      resource: Collection('dinos'),
      actions: {
        read: Query(Lambda(['dinoReference'], Equals(Select(['data', 'rarity'], Get(Var('dinoReference'))), 'common')))
      }
    }
  ]
})

/* Roles can also be bound to a function, here we separate the permissions per function.
 * This is mainly for documentation purposes so you can see how roles work. If you feel like it, you could create one big role
 * for all your functions as well. Sometimes (e.g. when functions take delicate parameters) it would be useful though to separate
 * permissions per UDF function.
 * Below we create the Role that will be bound to the login function. It needs
 * to be able to:
 * - retrieve accounts by email
 * - be able to read the underlying accounts of that index
 * - create and read sessions, each login creates a session
 * - create tokens (we will create tokens manually for more flexibility instead of using the Login function)
 */
const CreateFnRoleLogin = CreateOrUpdateRole({
  name: 'functionrole_login',
  privileges: [
    {
      resource: Index('accounts_by_email'),
      actions: { read: true }
    },
    {
      resource: Collection('accounts'),
      actions: { read: true }
    },
    {
      resource: Collection('account_sessions'),
      actions: { read: true, create: true }
    },
    {
      resource: Tokens(),
      actions: { create: true }
    }
  ]
})

/* The register role is not very special, it just needs to be able to create an account.
 * when your app becomes more complex, it could be that you want to do more than creating an account to
 * preconfigure a new user in your app when the register UDF is called. In that case, you would add extra permissions here.
 */
const CreateFnRoleRegister = CreateOrUpdateRole({
  name: 'functionrole_register',
  privileges: [
    {
      resource: Collection('accounts'),
      actions: { create: true }
    }
  ]
})

/* This role defines what permissions an 'Account' get (literally a document in the 'accounts' collection)
 * once it is authenticated (in other words, when a query is called with a token that is linked to 'Account')
 * By using membership we say that each account has accesss to the below permissions.
 * Our permissions indicate that the role only gives access to 'dinos' that are not 'legendary'.
 * Those are reserved for the admin account (next role)
 */
const CreateLoggedInRole = CreateOrUpdateRole({
  name: 'membershiprole_loggedin',
  membership: [{ resource: Collection('accounts') }],
  privileges: [
    {
      resource: Collection('dinos'),
      actions: {
        read: Query(
          Lambda(['dinoReference'], Not(Equals(Select(['data', 'rarity'], Get(Var('dinoReference'))), 'legendary')))
        )
      }
    }
  ]
})

/* Another membership role to exemplify how you could give more elevated access to specific accounts (like admins)
 * In our case, admins are the only ones that have access to all dinos. We do that by
 * Writing a predicate function on this role that checks whether the currently logged in document
 * (or in other words the document that is linked t othe token that was used to authenticate this query) is a user
 * with the type attribute set to 'admin'.
 * Only these users get privileges to read all dinos.
 */
const CreateLoggedInRoleAdmin = CreateOrUpdateRole({
  name: 'membershiprole_loggedin_admin',
  membership: [
    {
      resource: Collection('accounts'),
      predicate: Query(Lambda(['accountRef'], Equals(Select(['data', 'type'], Get(Var('accountRef'))), 'admin')))
    }
  ],
  privileges: [
    {
      resource: Collection('dinos'),
      actions: {
        read: true
      }
    }
  ]
})

/* The refresh role is a membership role that will give access to something completely different than accounts.
 * Refresh tokens are linked to a 'session' document and will therefore have completely different permissions than
 * accounts.
 *
 * The only permissions we give such a refresh token is to call the 'refresh_token' UDF and one of the two
 * 'logout' UDFs. Obviously, a refresh token is powerful since it can create tokens for accounts. We
 * will therefore handle these with great care and store them in secure httpOnly cookies.
 *
 * We chose not to give a refresh token direct access to data though and there is a good reason.
 * - First an attacker that gets hold of a refresh token might not know how to use it. since that will allow us to verify whether refresh tokens might be
 *   stolen (of course, this is 'security by obscurity' which is not something you should rely on but it's not a bad idea to make it harder)
 * - If the only way to get access to data via a refresh token is to create an access token we can so some clever tricks
 *   to verify whether a refresh token hsa been leaked (authentication providers do these kind of things for you)
 */

const CreateRefreshRole = CreateOrUpdateRole({
  name: 'membership_role_refresh_logout',
  membership: [{ resource: Collection('account_sessions') }],
  privileges: [
    {
      resource: q.Function('refresh_token'),
      actions: {
        call: true
      }
    },
    {
      resource: q.Function('logout'),
      actions: {
        call: true
      }
    },
    {
      resource: q.Function('logout_all'),
      actions: {
        call: true
      }
    }
  ]
})

/* This role defines everything that the refresh_token and logout functions should be able to do
 * this are powerful permissions hence why we encapsulate these in a User Defined Function (UDF)
 */

const CreateFnRoleRefreshTokens = CreateOrUpdateRole({
  name: 'functionrole_refresh_tokens_logout',
  privileges: [
    {
      resource: Collection('accounts'),
      actions: { read: true }
    },
    {
      resource: Collection('account_sessions'),
      actions: { read: true, create: true, write: true }
    },
    {
      // We could limit this further but this is ok for now.
      // As the function can't be changed and takes no parameters.
      resource: Tokens(),
      actions: { read: true, create: true, delete: true }
    },
    {
      resource: Index('access_tokens_by_session'),
      actions: { read: true }
    },
    {
      resource: Index('tokens_by_instance'),
      actions: { read: true }
    },
    {
      resource: Index('account_sessions_by_account'),
      actions: { read: true }
    }
  ]
})

export {
  CreateBootstrapRoleFrontend,
  CreateBootstrapRoleBackend,
  CreateFnRoleLogin,
  CreateRefreshRole,
  CreateFnRoleRegister,
  CreateFnRoleRefreshTokens,
  CreateLoggedInRole,
  CreateLoggedInRoleAdmin
}

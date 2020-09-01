import { DeleteIfExists, IfNotExists } from './../helpers/fql'

const faunadb = require('faunadb')
const q = faunadb.query
const { Do, Create, CreateCollection, CreateIndex, Collection, Index, Tokens } = q

/* Collection */

const CreateAccountsCollection = CreateCollection({ name: 'accounts' })

/* Indexes */
const CreateIndexAllAccounts = CreateIndex({
  name: 'all_accounts',
  source: Collection('accounts'),
  // this is the default collection index, no terms or values are provided
  // which means the index will sort by reference and return only the reference.
  serialized: true
})

const CreateIndexAccountsByEmail = CreateIndex({
  name: 'accounts_by_email',
  source: Collection('accounts'),
  // We will search on email
  terms: [
    {
      field: ['data', 'email']
    }
  ],
  // if no values are added, the index will just return the reference.
  // Prevent that accounts with duplicate e-mails are made.
  // uniqueness works on the combination of terms/values
  unique: true,
  serialized: true
})

const CreateAccountsSessionRefreshCollection = CreateCollection({ name: 'account_sessions' })

const CreateIndexAccessTokensByRefreshTokens = CreateIndex({
  name: 'access_tokens_by_session',
  source: Tokens(),
  terms: [
    {
      field: ['data', 'session']
    }
  ],
  unique: false,
  serialized: true
})

const CreateIndexSessionByAccount = CreateIndex({
  name: 'account_sessions_by_account',
  source: Collection('account_sessions'),
  terms: [
    {
      field: ['data', 'account']
    }
  ],
  unique: false,
  serialized: true
})

const CreateIndexTokensByInstance = CreateIndex({
  name: 'tokens_by_instance',
  source: Tokens(),
  terms: [
    {
      field: ['instance']
    }
  ],
  unique: false,
  serialized: true
})

async function createAccountCollection(client) {
  const accountsRes = await client.query(IfNotExists(Collection('accounts'), CreateAccountsCollection))
  await client.query(IfNotExists(Collection('account_sessions'), CreateAccountsSessionRefreshCollection))
  await client.query(IfNotExists(Index('accounts_by_email'), CreateIndexAccountsByEmail))
  await client.query(IfNotExists(Index('all_accounts'), CreateIndexAllAccounts))
  await client.query(IfNotExists(Index('access_tokens_by_session'), CreateIndexAccessTokensByRefreshTokens))
  await client.query(IfNotExists(Index('account_sessions_by_account'), CreateIndexSessionByAccount))
  await client.query(IfNotExists(Index('tokens_by_instance'), CreateIndexTokensByInstance))
  return accountsRes
}

async function deleteAccountsCollection(client) {
  await client.query(DeleteIfExists(Collection('accounts')))
  await client.query(DeleteIfExists(Collection('account_sessions')))
  await client.query(DeleteIfExists(Index('accounts_by_email')))
  await client.query(DeleteIfExists(Index('all_accounts')))
  await client.query(DeleteIfExists(Index('access_tokens_by_session')))
  await client.query(DeleteIfExists(Index('account_sessions_by_account')))
  await client.query(DeleteIfExists(Index('tokens_by_instance')))
}

const PopulateAccounts = Do(
  Create(Collection('accounts'), {
    data: {
      email: 'normal@test.com',
      type: 'normal'
    },
    credentials: {
      password: 'testtest'
    }
  }),
  Create(Collection('accounts'), {
    data: {
      email: 'admin@test.com',
      type: 'admin'
    },
    credentials: {
      password: 'testtest'
    }
  })
)

export { createAccountCollection, deleteAccountsCollection, PopulateAccounts }

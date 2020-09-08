import { createAccountCollection, PopulateAccounts } from './accounts'
import { createDinoCollection, PopulateDinos } from './dinos'
import { handleSetupError } from '../helpers/errors'
import { executeFQL } from '../helpers/fql'

import {
  CreateBootstrapRoleBackend,
  CreateBootstrapRoleFrontend,
  CreateFnRoleLogin,
  CreateFnRoleRegister,
  CreateLoggedInRole,
  CreateLoggedInRoleAdmin,
  CreateFnRoleRefreshTokens,
  CreateRefreshRole,
  CreateAccountVerificationRole,
  CreateChangePasswordRequestRole
} from './roles'
import {
  LoginUDF,
  RegisterUDF,
  RefreshTokenUDF,
  LogoutAllUDF,
  LogoutUDF,
  VerifyAccessTokenUDF,
  RequestResetUDF
} from './functions'

async function setupDatabase(client) {
  const resAccounts = await handleSetupError(
    createAccountCollection(client),
    'collections/indexes - accounts collection'
  )
  const resDinos = await handleSetupError(createDinoCollection(client), 'collections/indexes - dinos collection')

  // Before we define functions we need to define the roles that will be assigned to them.
  await executeFQL(client, CreateFnRoleLogin, 'roles - function role - login')
  await executeFQL(client, CreateFnRoleRegister, 'roles - function role - register')
  await executeFQL(client, CreateFnRoleRefreshTokens, 'roles - function role - refresh')

  // Define the functions we will use
  await executeFQL(client, LoginUDF, 'functions - login')
  await executeFQL(client, RegisterUDF, 'functions - register')
  await executeFQL(client, RefreshTokenUDF, 'functions - refresh')
  await executeFQL(client, LogoutAllUDF, 'functions - logout all')
  await executeFQL(client, LogoutUDF, 'functions - logout')
  await executeFQL(client, VerifyAccessTokenUDF, 'functions - verify token')
  await executeFQL(client, RequestResetUDF, 'functions - request reset')

  // Now that we have defined the functions, the bootstrap role will give access to these functions.
  await executeFQL(client, CreateBootstrapRoleBackend, 'roles - normal - bootstrap backend')
  await executeFQL(client, CreateBootstrapRoleFrontend, 'roles - normal - bootstrap frontend')

  // Finally the membership role will give logged in Accounts (literally members from the Accounts collection)
  // access to the protected data.
  await executeFQL(client, CreateLoggedInRole, 'roles - membership role - logged in')
  await executeFQL(client, CreateLoggedInRoleAdmin, 'roles - membership role - logged in admin role')
  await executeFQL(client, CreateRefreshRole, 'roles - membership role - refresh')
  await executeFQL(client, CreateAccountVerificationRole, 'roles - membership role - account verification role')
  await executeFQL(client, CreateChangePasswordRequestRole, 'roles - membership role - password reset role')

  // Populate, add some mascottes if the collection was newly made
  // (resDinos will contain the collection if it's newly made, else false)
  if (resDinos) {
    await executeFQL(client, PopulateDinos, 'populate - add some mascot data')
  }
  // Add some example accounts
  if (resAccounts) {
    await executeFQL(client, PopulateAccounts, 'populate - add some accounts data')
  }
}

async function updateFunctions(client) {
  // Both are wrapped in our wrapper (CreateOrUpdateFunction) so they will just update if they already exist.
  await executeFQL(client, LoginUDF, 'functions - login')
  await executeFQL(client, RegisterUDF, 'functions - register')
}

export { setupDatabase, updateFunctions }

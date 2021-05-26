import { CreateFunction, Query, Lambda, Var } from 'faunadb'

import { CreateEmailVerificationToken } from '../../../src/verification-tokens'

export default CreateFunction({
  name: 'get_account_verification_token',
  body: Query(Lambda(['accountRef'], CreateEmailVerificationToken(Var('accountRef')))),
  role: 'server'
})

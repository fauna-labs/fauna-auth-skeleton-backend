import {
  Query,
  Lambda,
  CreateFunction,
  Var,
  If,
  Let,
  Documents,
  Select,
  Get,
  Exists,
  Collection
} from 'faunadb'

const defaultConfig = { call_limits: { max_failed_logins: 5 } }

export default CreateFunction({
  name: 'get_config_var',
  body: Query(
    Lambda(
      ['pathObj'],
      Let(
        {
          configPath: Select(['path'], Var('pathObj'))
        },
        Select(
          Var('configPath'),
          Let(
            {
              configSet: Documents(Collection('config'))
            },
            If(Exists(Var('configSet')), Select(['data'], Get(Var('configSet'))), defaultConfig)
          ),
          Select(Var('configPath'), defaultConfig)
        )
      )
    )
  ),
  role: 'server'
})

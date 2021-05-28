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

const defaultConfig = {
  rate_limiting: {
    failed_logins: { max: 3, enabled: true },
    register: { calls: 100, per_milliseconds: 3600000 },
    get_dinos_public: { calls: 20, per_milliseconds: 60000 },
    get_dinos_private: { calls: 3, per_milliseconds: 60000 }
  },
  logging: { login: true, register: true, logout: true, refresh: true },
  session: {
    access_tokens: { lifetime_seconds: 600 },
    refresh_tokens: {
      reclaimtime_seconds: 604800,
      lifetime_seconds: 28800,
      graceperiod_seconds: 20
    }
  }
}

export default CreateFunction({
  name: 'config_var',
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

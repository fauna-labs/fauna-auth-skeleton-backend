import {
  CreateFunction,
  Query,
  Lambda,
  Select,
  And,
  Map,
  Paginate,
  Documents,
  Collection,
  Get,
  Index,
  HasCurrentIdentity,
  Equals,
  CurrentIdentity,
  Match,
  Difference,
  Do,
  Call
} from 'faunadb'

import { Switch } from '../../../src/switch'

const GetAllDinos = Map(
  Paginate(Documents(Collection('dinos'))),
  Lambda(x => Get(x))
)

const GetAllNonLegendaryDinos = Map(
  Paginate(
    Difference(Documents(Collection('dinos')), Match(Index('dinos_by_rarity'), 'legendary'))
  ),
  Lambda(x => Get(x))
)

const GetAllCommonDinos = Map(
  Paginate(Match(Index('dinos_by_rarity'), 'common')),
  Lambda(x => Get(x))
)

const IdentityBasedRateLimit = Call(
  'rate_limit',
  'get-dinos',
  CurrentIdentity(),
  Call('config_var', { path: ['rate_limiting', 'get_dinos_private', 'calls'] }),
  Call('config_var', { path: ['rate_limiting', 'get_dinos_private', 'per_milliseconds'] })
)
const PublicRateLimit = Call(
  'rate_limit',
  'get-dinos',
  'public',
  Call('config_var', { path: ['rate_limiting', 'get_dinos_public', 'calls'] }),
  Call('config_var', { path: ['rate_limiting', 'get_dinos_public', 'per_milliseconds'] })
)

export default CreateFunction({
  name: 'get_all_dinos',
  body: Query(
    Lambda(
      [],
      Switch(
        [
          {
            if: And(
              HasCurrentIdentity(),
              Equals(Select(['data', 'type'], Get(CurrentIdentity()), 'normal'), 'admin')
            ),
            then: GetAllDinos
          },
          {
            if: HasCurrentIdentity(),
            then: Do(IdentityBasedRateLimit, GetAllNonLegendaryDinos)
          }
        ],
        Do(PublicRateLimit, GetAllCommonDinos)
      )
    )
  ),
  role: 'server'
})

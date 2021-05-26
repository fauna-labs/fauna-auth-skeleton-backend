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

const IdentityBasedRateLimit = Call('rate_limit', 'get-dinos', CurrentIdentity(), 3, 60000)
const PublicRateLimit = Call('rate_limit', 'get-dinos', 'public', 20, 60000)

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
            then: Do(IdentityBasedRateLimit, GetAllDinos)
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

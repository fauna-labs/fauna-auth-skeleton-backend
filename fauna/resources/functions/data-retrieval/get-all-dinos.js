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
  Difference
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

export default CreateFunction({
  name: 'get_all_dinos',
  body: Query(
    Lambda(
      [],
      Switch([
        {
          if: And(
            HasCurrentIdentity(),
            Equals(Select(['data', 'type'], Get(CurrentIdentity()), 'normal'), 'admin')
          ),
          then: GetAllDinos
        },
        {
          if: HasCurrentIdentity(),
          then: GetAllNonLegendaryDinos
        },
        {
          if: true,
          then: GetAllCommonDinos
        }
      ])
    )
  ),
  role: 'server'
})

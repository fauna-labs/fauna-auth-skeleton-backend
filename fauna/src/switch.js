import { Select, Filter, Lambda, Var } from 'faunadb'

export function Switch(expressionArr) {
  return Select(
    [0, 'then'],
    Filter(expressionArr, Lambda(['expAndRes'], Select(['if'], Var('expAndRes'))))
  )
}

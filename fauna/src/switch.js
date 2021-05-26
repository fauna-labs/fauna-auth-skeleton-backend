import fauna from 'faunadb'

const q = fauna.query
const { Select, Filter, Lambda, Var } = q

export function Switch(expressionArr) {
  return Select(
    [0, 'then'],
    Filter(expressionArr, Lambda(['expAndRes'], Select(['if'], Var('expAndRes'))))
  )
}

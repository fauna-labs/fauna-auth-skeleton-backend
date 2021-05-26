import { If } from 'faunadb'

export function Switch(expressionArr, defaultValue) {
  if (expressionArr.length > 0) {
    var head = expressionArr[0]
    var tail = expressionArr.slice(1)
    return If(head.if, head.then, Switch(tail, defaultValue))
  } else {
    return defaultValue
  }
}

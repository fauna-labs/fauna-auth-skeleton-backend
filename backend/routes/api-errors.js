export const handleLoginError = (err, res) => {
  const codeAndDescription = retrieveErrorAndDescription(err)

  if (codeAndDescription && codeAndDescription.description) {
    res.status(200).send({ error: codeAndDescription.description })
    console.log(err)
  } else {
    console.log(err)
    res.status(400).send({ error: 'Login failed' })
  }
}

export const handleRegisterError = (err, res) => {
  const codeAndDescription = retrieveErrorAndDescription(err)
  console.log(codeAndDescription)
  if (codeAndDescription && codeAndDescription.code.includes('instance not unique')) {
    res.status(400).send({ error: 'An account with that e-mail or handle already exists' })
  } else if (
    codeAndDescription &&
    codeAndDescription.description.includes('Invalid e-mail provided')
  ) {
    res.status(400).send({ error: 'Invalid e-mail provided' })
  } else if (codeAndDescription && codeAndDescription.description.includes('Invalid password')) {
    res.status(400).send({ error: 'Invalid password' })
  } else {
    console.log(err)
    res.status(500).send({ error: 'Oops something went wrong' })
  }
}

export const handleVerificationError = (err, res) => {
  console.error(err)
  res.status(500).send({ error: 'Oops something went wrong' })
}

export const getRefreshErrorCode = err => {
  return retrieveErrorAndDescription(err, ['requestResult', 'responseContent', 'errors']).code
}

export const handleResetError = (err, res) => {
  // no special handling atm
  console.log(err)
}

export const retrieveErrorAndDescription = error => {
  return findNestedCause(
    safeVerifyErrorRecursive(error, ['requestResult', 'responseContent', 'errors'])
  )
}

const safeVerifyErrorRecursive = (error, keys) => {
  if (keys.length > 0) {
    if (error && error[keys[0]]) {
      const newError = error[keys[0]]
      keys.shift()
      return safeVerifyErrorRecursive(newError, keys)
    } else {
      return false
    }
  }
  return error
}

const findNestedCause = error => {
  if (error && error[0] && error[0].cause) {
    return findNestedCause(error[0].cause)
  } else {
    return error[0]
  }
}

import { safeVerifyError } from '../../fauna-queries/helpers/errors'

export const handleLoginError = (err, res) => {
  const codeAndDescription = safeVerifyError(err, [
    'requestResult',
    'responseContent',
    'errors', // The errors of the call
    0,
    'cause',
    0
  ])

  if (codeAndDescription && codeAndDescription.description) {
    res.status(200).send({ error: codeAndDescription.description })
    console.log(err)
  } else {
    console.log(err)
    res.status(400).send({ error: 'Login failed' })
  }
}

export const handleRegisterError = (err, res) => {
  const codeAndDescription = safeVerifyError(err, [
    'requestResult',
    'responseContent',
    'errors', // The errors of the call
    0,
    'cause',
    0,
    'cause',
    0
  ])
  if (codeAndDescription && codeAndDescription.code.includes('instance not unique')) {
    res.status(400).send({ error: 'An account with that e-mail or handle already exists' })
  } else if (codeAndDescription && codeAndDescription.code.includes('Invalid e-mail provided')) {
    res.status(400).send({ error: 'Invalid e-mail provided' })
  } else if (codeAndDescription && codeAndDescription.code.includes('Invalid password')) {
    res.status(400).send({ error: 'Invalid password' })
  } else {
    console.log(err)
    res.status(500).send({ error: 'Oops something went wrong' })
  }
}

export const getRefreshErrorCode = err => {
  return safeVerifyError(err, [
    'requestResult',
    'responseContent',
    'errors', // The errors of the call
    0,
    'cause',
    0,
    'code'
  ])
}

export const handleResetError = (err, res) => {
  // no special handling atm
  console.log(err)
}

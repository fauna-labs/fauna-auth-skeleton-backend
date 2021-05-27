import { retrieveErrorAndDescription } from '../../../backend/routes/api-errors'
import { RATE_LIMITING } from '../../../fauna/src/rate-limiting'

export const handleChangePasswordError = (err, toast) => {
  const codeAndDescription = retrieveErrorAndDescription(err)
  console.log(codeAndDescription)
  if (codeAndDescription && codeAndDescription.description.includes('Invalid password')) {
    toast.error('Invalid password provided')
  } else {
    console.log(err)
    toast.error('Oops something went wrong')
  }
}

export const handleLoadingError = (err, setLoading, setError, toast) => {
  const errorAndCode = retrieveErrorAndDescription(err)
  if (errorAndCode.code === 'unauthorized') {
    toast.warn('Verification token no longer valid')
    setLoading(false)
  } else {
    toast.error(err.description)
    setLoading(false)
    setError(true)
  }
}

export const handleDataLoadingError = (err, user, sessionContext, setLoading, toast) => {
  const errorAndCode = retrieveErrorAndDescription(err)

  if (errorAndCode && errorAndCode.code === 'transaction aborted') {
    if (errorAndCode.description === RATE_LIMITING) {
      toast.warn('Rate limiting')
    }
  } else if (errorAndCode && errorAndCode.code === 'unauthorized') {
    if (user) {
      sessionContext.dispatch({ type: 'logout', data: null })
      toast.warn('You have been logged out')
    } else {
      toast.error(err.description)
    }
  } else {
    console.log(err)
  }
  setLoading(false)
}

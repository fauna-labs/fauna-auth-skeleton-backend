import { retrieveErrorAndDescription } from '../../../backend/routes/api-errors'

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

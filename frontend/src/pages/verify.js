import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import Loading from '../components/states/loading'
// import SessionContext from '../context/session'
import { faunaAPI } from '../api/fauna-api'
import { toast } from 'react-toastify'
import { safeVerifyError } from '../../../fauna-queries/helpers/errors'

const Verify = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const { verification } = useParams()

  useEffect(() => {
    setLoading(true)
    faunaAPI
      .verifyEmail(verification)
      .then(res => {
        setLoading(false)
        toast.info('Account verified')
      })
      .catch(err => handleLoadingError(err, setLoading, setError))
  }, [setLoading, setError])

  if (loading) {
    return Loading()
  } else if (error) {
    return (
      <div className="form-container">
        <div> Failed to verify your account</div>
      </div>
    )
  } else {
    return (
      <div className="form-container">
        <div>
          succesfully verified your account, click here to return to <a href="/">home.</a>
        </div>
      </div>
    )
  }
}

function handleLoadingError(err, setLoading, setError) {
  const errorAndCode = safeVerifyError(err, ['responseContent', 'errors', 0])
  if (errorAndCode.code === 'unauthorized') {
    toast.warn('Verification token no longer valid')
    setLoading(false)
  } else {
    toast.error(err.description)
    setLoading(false)
    setError(true)
  }
}

export default Verify

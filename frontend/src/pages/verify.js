import React, { useState, useEffect, useContext } from 'react'
import { useParams, useHistory } from 'react-router-dom'

import Loading from '../components/states/loading'
// import SessionContext from '../context/session'
import { faunaAPI } from '../api/fauna-api'
import { toast } from 'react-toastify'
import { safeVerifyError } from '../../../fauna-queries/helpers/errors'
import SessionContext from './../context/session'

const Verify = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const { verification } = useParams()
  const history = useHistory()
  const sessionContext = useContext(SessionContext)

  useEffect(() => {
    setLoading(true)
    faunaAPI
      .verifyEmail(verification)
      .then(res => {
        sessionContext.dispatch({ type: 'verified' })
        setLoading(false)
        toast.info('Account verified')
        history.push('/accounts/login')
      })
      .catch(err => handleLoadingError(err, setLoading, setError))
  }, [setLoading, setError])

  if (loading) {
    return Loading()
  } else if (error) {
    return (
      <React.Fragment>
        <div> Failed to verify your account</div>
      </React.Fragment>
    )
  } else {
    return (
      <React.Fragment>
        <div> succesfully verified your account</div>
      </React.Fragment>
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

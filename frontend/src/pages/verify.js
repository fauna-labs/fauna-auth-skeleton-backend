import React, { useState, useEffect } from 'react'
import { useParams, useHistory } from 'react-router-dom'

import Loading from '../components/states/loading'
// import SessionContext from '../context/session'
import { faunaAPI } from '../api/fauna-api'
import { toast } from 'react-toastify'

const Verify = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const { verification } = useParams()
  const history = useHistory()

  useEffect(() => {
    setLoading(true)
    faunaAPI
      .verifyEmail(verification)
      .then(res => {
        setLoading(false)
        history.push('/')
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
  console.error(err)
  toast.error(err.description)
  setLoading(false)
  setError(true)
}

export default Verify

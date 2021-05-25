import React, { useContext } from 'react'
import { toast } from 'react-toastify'
import * as backendAPI from '../api/backend-api'
import SessionContext from '../context/session'
import Form from './../components/form'

const handleRegister = (event, username, password) => {
  console.log('INFO - Registering users')
  backendAPI
    .register(username, password)
    .then(e => {
      toast.success('User registered, please verify your email')
    })
    .catch(e => {
      if (e.error) {
        toast.error(e.error)
      } else {
        console.log(e)
        toast.error('Oops, something went wrong')
      }
    })
  event.preventDefault()
}

const Register = () => {
  const sessionContext = useContext(SessionContext)
  const { user } = sessionContext.state

  if (!user) {
    return (
      <Form
        title="Register"
        formType="register"
        handleSubmit={(event, username, password) => handleRegister(event, username, password)}
      ></Form>
    )
  } else {
    return (
      <div className="form-container">
        <div className="form-title"> Login </div>
        <div className="form-text">You are already logged in, logout first!</div>
      </div>
    )
  }
}

export default Register

import React from 'react'
import { toast } from 'react-toastify'
import * as backendAPI from '../api/backend-api'
import Form from './../components/form'

const handleRegister = (event, username, password) => {
  backendAPI
    .register(username, password)
    .then(e => {
      console.log(e)
      toast.success('User registered')
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
  return (
    <Form
      title="Register"
      formType="register"
      handleSubmit={(event, username, password) => handleRegister(event, username, password)}
    ></Form>
  )
}

export default Register

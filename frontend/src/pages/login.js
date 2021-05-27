import React, { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { toast } from 'react-toastify'

import SessionContext from './../context/session'
import { faunaAPI } from '../api/fauna-api'
import parseQuery from './../util/parse-query'

// Components
import Form from '../components/form'

const handleLogin = (event, username, password, history, sessionContext) => {
  console.log('INFO - Attempting to log in')
  faunaAPI
    .login(username, password)
    .then(res => {
      if (res.error) {
        toast.error(res.error)
      } else if (res === false) {
        toast.error('Login failed')
      } else {
        toast.success('Login successful')
        sessionContext.dispatch({ type: 'login', data: res.account.data })
        history.push('/')
      }
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

const Login = props => {
  const history = useHistory()
  const queryParams = parseQuery(history.location.search)
  if (queryParams.error) {
    toast.error(queryParams.error)
  }
  const sessionContext = useContext(SessionContext)
  const { loggedIn } = sessionContext.state

  if (!loggedIn) {
    return (
      <Form
        title="Login"
        formType="login"
        handleSubmit={(event, username, password) =>
          handleLogin(event, username, password, history, sessionContext)
        }
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

export default Login

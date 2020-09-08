import React, { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { toast } from 'react-toastify'

import SessionContext from './../context/session'
import { faunaQueries } from '../fauna/query-manager'

// Components
import Form from '../components/form'

const handleLogin = (event, username, password, history, sessionContext) => {
  faunaQueries
    .login(username, password)
    .then(res => {
      console.log(res)
      if (res === false) {
        toast.error('Login failed')
      } else {
        toast.success('Login successful')
        sessionContext.dispatch({ type: 'login', data: faunaQueries.getAccount() })
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
  const { user } = sessionContext.state
  if (!user) {
    return (
      <Form
        title="Login"
        formType="login"
        handleSubmit={(event, username, password) => handleLogin(event, username, password, history, sessionContext)}
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

function parseQuery(queryString) {
  var query = {}
  var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&')
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=')
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '')
  }
  return query
}

export default Login

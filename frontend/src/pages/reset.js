import React, { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { toast } from 'react-toastify'

import SessionContext from './../context/session'
import { faunaAPI } from '../api/fauna-api'
import parseQuery from './../util/parse-query'

// Components
import Form from '../components/form'

const handleResetRequest = (event, username, history, sessionContext) => {
  event.preventDefault()
  faunaAPI
    .reset(username)
    .then(res => {
      console.log(res)
      if (res === false) {
        toast.error('Reset failed')
      } else {
        // Whether we find an email or not, we will provide the same message
        toast.success('If the account exists, a reset email was sent to', username)
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
}

const handleResetPassword = (event, password, rpassword, history, sessionContext) => {
  event.preventDefault()
  const queryParams = parseQuery(history.location.search)

  if (password !== rpassword) {
    toast.error('Passwords do not match')
  } else {
    faunaAPI
      .changePassword(password, queryParams.token)
      .then(res => {
        if (res === false) {
          toast.error('Password change failed')
        } else {
          toast.success('password changed!')
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
  }
}

const Reset = props => {
  const history = useHistory()
  const queryParams = parseQuery(history.location.search)
  if (queryParams.error) {
    toast.error(queryParams.error)
  }
  const sessionContext = useContext(SessionContext)
  if (queryParams.token) {
    return (
      <Form
        title="Change password"
        formType="change_password"
        handleSubmit={(event, username, password, rpassword) =>
          handleResetPassword(event, password, rpassword, history, sessionContext)
        }
      ></Form>
    )
  } else {
    return (
      <Form
        title="Request Reset"
        formType="reset_request"
        handleSubmit={(event, username) => handleResetRequest(event, username, history, sessionContext)}
      ></Form>
    )
  }
}

export default Reset

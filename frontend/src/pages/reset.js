import React, { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { toast } from 'react-toastify'

import SessionContext from './../context/session'
import { faunaAPI } from '../api/fauna-api'
import parseQuery from './../util/parse-query'

// Components
import Form from '../components/form'
import { handleChangePasswordError } from '../api/fauna-api-errors'

const Reset = props => {
  const history = useHistory()
  const queryParams = parseQuery(history.location.search)
  if (queryParams.error) {
    toast.error(queryParams.error)
  }
  const sessionContext = useContext(SessionContext)
  const { loggedIn } = sessionContext.state

  const handleChangePassword = (event, newPassword, newPasswordRepeat, oldPassword) => {
    event.preventDefault()
    if (newPassword !== newPasswordRepeat) {
      toast.error('Passwords do not match')
    } else {
      faunaAPI
        .changePassword(oldPassword, newPassword)
        .then(res => {
          if (res) {
            toast.success('Changed password')
          } else {
            toast.error('wrong password')
          }
        })
        .catch(err => handleChangePasswordError(err, toast))
    }
  }

  const handleResetRequest = (event, username) => {
    event.preventDefault()
    faunaAPI
      .requestReset(username)
      .then(res => {
        // Whether we find an email or not, we will provide the same message
        toast.success('If the account exists, a reset email was sent to', username)
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

  const handleResetPassword = (event, password, rpassword) => {
    event.preventDefault()
    const queryParams = parseQuery(history.location.search)

    if (password !== rpassword) {
      toast.error('Passwords do not match')
    } else {
      faunaAPI
        .resetPassword(password, queryParams.token)
        .then(res => {
          toast.success('password changed!')
          history.push('/accounts/login')
        })
        .catch(err => handleChangePasswordError(err, toast))
    }
  }

  if (loggedIn) {
    return (
      <Form
        title="Change password"
        formType="change_password"
        handleSubmit={(event, username, password, rpassword, currentpassword) =>
          handleChangePassword(event, password, rpassword, currentpassword)
        }
      ></Form>
    )
  }
  if (queryParams.token) {
    return (
      <Form
        title="Reset password"
        formType="reset_password"
        handleSubmit={(event, username, password, rpassword) =>
          handleResetPassword(event, password, rpassword)
        }
      ></Form>
    )
  } else {
    return (
      <Form
        title="Request Reset"
        formType="reset_request"
        handleSubmit={(event, username) => handleResetRequest(event, username)}
      ></Form>
    )
  }
}

export default Reset

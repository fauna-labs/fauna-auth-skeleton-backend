import React, { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { toast } from 'react-toastify'

import SessionContext from './../context/session'
import { faunaAPI } from '../api/fauna-api'
import parseQuery from './../util/parse-query'

// Components
import Form from '../components/form'

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
        .catch(e => {
          toast.error('Oops, something went wrong')
        })
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
          if (res.error) {
            toast.error('Password change failed')
          } else {
            toast.success('password changed!')
            history.push('/')
          }
        })
        .catch(e => {
          toast.error('Oops, something went wrong')
        })
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

import React, { useContext } from 'react'
import { toast } from 'react-toastify'
import SessionContext from '../context/session'
import { faunaAPI } from '../api/fauna-api'

const NotificationBar = props => {
  // MOVE TO WARNING BAR..
  const sessionContext = useContext(SessionContext)
  const { user } = sessionContext.state

  const handleResendVerification = event => {
    faunaAPI
      .resendVerificationEmail(user.email)
      .then(res => {
        toast.success('Verification email sent')
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

  if (user && !user.verified) {
    return (
      <div className="notification-bar">
        Please verify your account first. Click here to
        <a href="#" onClick={event => handleResendVerification(event)}>
          resend the email verification.
        </a>
      </div>
    )
  } else {
    return null
  }
}

export default NotificationBar

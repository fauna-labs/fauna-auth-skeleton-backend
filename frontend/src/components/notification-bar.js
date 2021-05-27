import React, { useContext } from 'react'
import { toast } from 'react-toastify'
import SessionContext from '../context/session'
import { faunaAPI } from '../api/fauna-api'

const NotificationBar = props => {
  // MOVE TO WARNING BAR..
  const sessionContext = useContext(SessionContext)
  const { user, loggedIn } = sessionContext.state

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
        <span className="bold"> Logged in, not verified</span>, you can only see public dinos,
        <a href="#" onClick={event => handleResendVerification(event)}>
          resend the email verification.
        </a>
      </div>
    )
  } else if (loggedIn) {
    if (user && user.type === 'admin') {
      return (
        <div className="notification-bar">
          <span className="bold">Admin Logged in</span>, you can now see all dinos and are not
          rate-limited
        </div>
      )
    } else {
      return (
        <div className="notification-bar">
          <span className="bold">User Logged in</span>, you can now see all dinos visible to the
          user, logout and change your password
        </div>
      )
    }
  } else {
    return (
      <div className="notification-bar">
        <span className="bold">Logged out</span>, you only see public dinos, can login, register and
        ask for a password reset
      </div>
    )
  }
}

export default NotificationBar

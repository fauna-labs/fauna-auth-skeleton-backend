import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { ToastContainer, toast } from 'react-toastify'
import { Link, useLocation } from 'react-router-dom'
import SessionContext from '../context/session'
import { faunaAPI } from '../api/fauna-api'
import Loading from './loading'
import NotificationBar from './notification-bar'
const links = [
  {
    link: '/',
    name: 'Home'
  },
  {
    link: '/accounts/register',
    name: 'Register'
  },
  {
    link: '/accounts/login',
    name: 'Login'
  },
  {
    link: '/accounts/logout',
    name: 'Logout'
  },
  {
    link: '/accounts/reset',
    name: 'Reset'
  }
]

const Layout = props => {
  const location = useLocation()
  const sessionContext = useContext(SessionContext)
  const [isLoading, setLoading] = useState('session')
  const { loggedIn, verified, sessionLifetime } = sessionContext.state

  const refreshOnce = async () => {
    console.log('INFO - Refreshing on load', new Date())
    if (location.pathname.includes('reset')) {
      setLoading(false)
    } else {
      try {
        const res = await faunaAPI.refreshToken()
        if (!res.error) {
          console.log('INFO - Session found, logging in', res)
          sessionContext.dispatch({
            type: 'login',
            account: res.account.data,
            sessionLifetime: res.sessionLifetime
          })
        } else {
          console.log('INFO - There is no session')
        }
        setLoading(false)
      } catch (err) {
        console.log(err)
        setLoading(false)
      }
    }
  }

  const refreshSilent = async () => {
    console.log(
      'INFO - silent refreshing session, well... not so silent given this log',
      new Date()
    )
    try {
      const res = await faunaAPI.refreshToken()
      sessionContext.dispatch({
        type: 'login',
        account: res.account.data,
        sessionLifetime: res.sessionLifetime
      })
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    if (loggedIn) {
      var id = null
      const delaySeconds = sessionLifetime * 0.75
      setTimeout(() => {
        id = setInterval(() => refreshSilent(), delaySeconds * 1000)
      }, delaySeconds)
      return () => clearInterval(id)
    } else {
      refreshOnce()
    }
  }, [loggedIn, verified])

  const bodyContent = () => {
    if (isLoading) {
      return Loading(isLoading)
    } else {
      return props.children
    }
  }

  return (
    <div className="page">
      <ToastContainer position={toast.POSITION.BOTTOM_RIGHT} />
      <link
        href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700&display=swap"
        rel="stylesheet"
      ></link>
      <div className="body-container">
        <div className="nav">{links.map(l => drawLink(loggedIn, l.name, l.link, location))}</div>
        <NotificationBar />
        <div className="data-container">{bodyContent()}</div>
      </div>
    </div>
  )
}

function drawLink(loggedIn, name, link, location) {
  const highlighted = location.pathname === link
  var classes = highlighted ? ['highlighted'] : []
  if (loggedIn && ['Register', 'Login'].includes(name)) {
    classes.push('disabled')
  }
  if (!loggedIn && ['Logout'].includes(name)) {
    classes.push('disabled')
  }
  return (
    <div key={'link-container-' + name} className="link-container">
      <Link key={'link-' + name} to={link} className={classes.join(' ')}>
        {name}
      </Link>
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node
}

export default Layout

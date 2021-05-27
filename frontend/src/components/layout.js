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
  const { loggedIn } = sessionContext.state

  const refreshOnce = () => {
    if (location.pathname.includes('reset')) {
      setLoading(false)
    } else {
      console.log('INFO - First page load, retrieving session', location)
      faunaAPI
        .refreshToken()
        .then(res => {
          if (!res.error) {
            console.log('INFO - Session found, logging in')
            sessionContext.dispatch({ type: 'login', data: res.account })
          } else {
            console.log('INFO - There is no session')
          }
          setLoading(false)
        })
        .catch(err => {
          console.log(err)
          setLoading(false)
        })
    }
  }

  const refreshSilent = () => {
    console.log('INFO - silent refreshing session, well... not so silent given this log')
    faunaAPI.refreshToken().catch(err => {
      console.log(err)
    })
  }

  useEffect(
    () => {
      refreshOnce()
      const id = setInterval(() => refreshSilent(), 30000) // 5 minutes
      return () => clearInterval(id)
    },
    [
      // run only once
    ]
  )

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

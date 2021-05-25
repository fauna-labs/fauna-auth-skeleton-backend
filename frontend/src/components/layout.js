import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { ToastContainer, toast } from 'react-toastify'
import { Link, useHistory, useLocation } from 'react-router-dom'
import SessionContext from '../context/session'
import { faunaAPI } from '../api/fauna-api'
import Loading from './states/loading'

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
  const history = useHistory()
  const [isLoading, setLoading] = useState(true)

  useEffect(
    () => {
      faunaAPI.refreshToken().then(res => {
        if (!res.error) {
          sessionContext.dispatch({ type: 'login', data: res.account.data })
        } else {
          history.push('/accounts/login')
        }
        setLoading(false)
      })
    },
    [
      // run only once
    ]
  )
  if (isLoading) {
    return <Loading></Loading>
  } else {
    return (
      <div className="page">
        <ToastContainer position={toast.POSITION.BOTTOM_RIGHT} />
        <link
          href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700&display=swap"
          rel="stylesheet"
        ></link>
        <div className="body-container">
          <div className="nav">{links.map(l => drawLink(l.name, l.link, location))}</div>
          <div className="data-container">{props.children}</div>
        </div>
      </div>
    )
  }
}

function drawLink(name, link, location) {
  const highlighted = location.pathname === link
  const highlightedClass = highlighted ? 'highlighted' : ''
  return (
    <div key={'link-container-' + name} className="link-container">
      <Link key={'link-' + name} to={link} className={highlightedClass}>
        {name}
      </Link>
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node
}

export default Layout

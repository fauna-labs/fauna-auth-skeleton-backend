import React, { useEffect, useContext } from 'react'
import PropTypes from 'prop-types'
import { ToastContainer, toast } from 'react-toastify'
import { Link, useLocation } from 'react-router-dom'
import SessionContext from '../context/session'
import { faunaQueries } from '../fauna/query-manager'

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
  }
]

const Layout = props => {
  const sessionContext = useContext(SessionContext)
  const location = useLocation()
  useEffect(
    () => {
      faunaQueries.checkAccessOrRefresh().then(res => {
        if (res && !res.error) {
          sessionContext.dispatch({ type: 'login', data: faunaQueries.getAccount() })
        }
      })
    },
    // only run once
    []
  )

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

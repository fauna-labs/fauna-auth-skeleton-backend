import React, { useEffect, useContext, useState } from 'react'
import { useHistory } from 'react-router-dom'
import Loading from '../components/states/loading'
import { toast } from 'react-toastify'

import { faunaQueries } from '../fauna/query-manager'

import SessionContext from '../context/session'

const Home = () => {
  const [dinos, setDinos] = useState(null)
  const [loading, setLoading] = useState(false)

  const history = useHistory()

  const sessionContext = useContext(SessionContext)
  const { user } = sessionContext.state

  useEffect(() => {
    if (!user) {
      setLoading(true)
      faunaQueries
        .refresh()
        .then(data => {
          if (data) {
            sessionContext.dispatch({ type: 'login', data: data })
            setLoading(false)
          } else {
            return getDinos(user, setLoading, setDinos, sessionContext)
          }
        })
        .catch(err => {
          setLoading(false)
          console.log(err)
        })
    } else {
      getDinos(user, setLoading, setDinos, sessionContext)
    }
  }, [user, history])

  if (loading) {
    return Loading()
  } else if (dinos && dinos.data.length) {
    return (
      <React.Fragment>
        <div className="dino-list">{showDinos(dinos)}</div>
      </React.Fragment>
    )
  } else {
    return (
      <div className="no-results-container">
        <p className="no-results-text">No Results Found</p>
        <img className="no-results-image" src="/images/dino-noresults.png" alt="no results" />
        <p className="no-results-subtext">No dinos are accessible!</p>
      </div>
    )
  }
}

async function getDinos(user, setLoading, setDinos, sessionContext) {
  return faunaQueries
    .getDinos()
    .then(res => {
      if (res !== false) {
        setDinos(res)
        setLoading(false)
      }
    })
    .catch(err => {
      if (err.description && err.description === 'Unauthorized') {
        if (user) {
          sessionContext.dispatch({ type: 'logout', data: null })
          toast.warn('You have been logged out')
        } else {
          toast.error(err.description)
        }
      }
      setLoading(false)
    })
}

function showDinos(dinos) {
  return dinos.data.map((d, i) => {
    return (
      <div className="dino-card" key={'dino-card-' + i}>
        <span className="dino-title" key={'dino-card-title-' + i}>
          {d.data.name}
        </span>
        <div className="dino-image-container" key={'dino-card-container-' + i}>
          <img className="dino-image" key={'dino-card-image' + i} src={`/images/${d.data.icon}`} alt="no results"></img>
        </div>
        <span key={'dino-card-rarity-' + i} className={'dino-rarity ' + d.data.rarity}>
          {d.data.rarity}
        </span>
      </div>
    )
  })
}

export default Home

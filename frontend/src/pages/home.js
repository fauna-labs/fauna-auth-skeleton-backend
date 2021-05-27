import React, { useEffect, useContext, useState } from 'react'
import { useHistory } from 'react-router-dom'
import Loading from '../components/loading'
import { toast } from 'react-toastify'

import { faunaAPI } from '../api/fauna-api'
import SessionContext from '../context/session'
import { handleDataLoadingError } from '../api/fauna-api-errors'

const Home = () => {
  const [dinos, setDinos] = useState(null)
  const [isLoading, setLoading] = useState(false)
  const history = useHistory()
  const sessionContext = useContext(SessionContext)
  const { user, loggedIn } = sessionContext.state

  useEffect(() => {
    setLoading(true)
    getDinos(user, loggedIn, sessionContext, setLoading, setDinos)
  }, [user, history, sessionContext])

  if (isLoading) {
    return Loading(isLoading)
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

async function getDinos(user, loggedIn, sessionContext, setLoading, setDinos) {
  return faunaAPI
    .getDinos(user, loggedIn)
    .then(res => {
      if (!res.error) {
        setDinos(res)
        setLoading(false)
      } else {
        setLoading(false)
      }
    })
    .catch(err => handleDataLoadingError(err, user, sessionContext, setLoading, toast))
}

function showDinos(dinos) {
  return dinos.data.map((d, i) => {
    return (
      <div className="dino-card" key={'dino-card-' + i}>
        <span className="dino-title" key={'dino-card-title-' + i}>
          {d.data.name}
        </span>
        <div className="dino-image-container" key={'dino-card-container-' + i}>
          <img
            className="dino-image"
            key={'dino-card-image' + i}
            src={`/images/${d.data.icon}`}
            alt="no results"
          ></img>
        </div>
        <span key={'dino-card-rarity-' + i} className={'dino-rarity ' + d.data.rarity}>
          {d.data.rarity}
        </span>
      </div>
    )
  })
}

export default Home

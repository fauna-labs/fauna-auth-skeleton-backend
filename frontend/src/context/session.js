import React from 'react'

const SessionContext = React.createContext({})

export const sessionReducer = (state, action) => {
  switch (action.type) {
    case 'login': {
      return {
        user: action.account,
        loggedIn: true,
        sessionLifetime: action.sessionLifetime,
        verified: action.account.verified
      }
    }
    case 'register': {
      return { user: action.data }
    }
    case 'logout': {
      return { user: null, loggedIn: false }
    }
    case 'verify': {
      if (state.loggedIn) {
        return {
          user: action.account,
          loggedIn: state.loggedIn,
          sessionLifetime: state.sessionLifetime,
          verified: action.account.verified
        }
      } else {
        return state
      }
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`)
    }
  }
}

export const SessionProvider = SessionContext.Provider
export const SessionConsumer = SessionContext.Consumer
export default SessionContext

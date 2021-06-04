import fauna, { Call } from 'faunadb'
import { retrieveErrorAndDescription } from '../../../backend/routes/api-errors'
import * as backendAPI from './backend-api'

class FaunaAPI {
  constructor() {
    this.client = this.getClient(process.env.REACT_APP_LOCAL___PUBLIC_BOOTSTRAP_KEY)
    this.logout = this.logout.bind(this)
    this.getClient = this.getClient.bind(this)
    this.lastRefresh = null
  }

  /** ******* Authentication is delegated through the backend *********/
  async login(email, password) {
    return await backendAPI.login(email, password).then(loginResult => {
      if (!loginResult.error) {
        this.client = this.getClient(loginResult.secret)
        this.lastRefresh = Date.now()
      }
      return loginResult
    })
  }

  async logout(all) {
    return await backendAPI.logout(all).then(res => {
      this.client = this.getClient(process.env.REACT_APP_LOCAL___PUBLIC_BOOTSTRAP_KEY)
      return res
    })
  }

  async requestReset(username) {
    return await backendAPI.requestReset(username)
  }

  async refreshToken() {
    return await backendAPI.refreshToken().then(res => {
      if (res.secret) {
        this.client = this.getClient(res.secret)
        return res
      } else {
        return res
      }
    })
  }

  async resendVerificationEmail(email) {
    return await backendAPI.resendVerificationEmail(email)
  }

  async verifyEmail(token) {
    return await backendAPI.verifyEmail(token)
  }

  /** ******* Calls directly to Fauna*********/
  async changePassword(oldPassword, newPassword) {
    return this.client.query(Call('change_password', oldPassword, newPassword))
  }

  async resetPassword(password, token) {
    const resetClient = this.getClient(token)
    return resetClient.query(Call('reset_password', password))
  }

  async getDinos(verified, loggedIn) {
    if (loggedIn && verified) {
      console.log('INFO - Retrieving dinos for logged in user with retry')
      return await this.callWithRefreshRetry(() => this.client.query(Call('get_all_dinos')))
    } else {
      console.log('INFO - Retrieving dinos')
      return await this.client.query(Call('get_all_dinos'))
    }
  }

  /** ******* Helpers *********/
  /* Helper wrapper that will catch failed queries and retry in case permission was denied. */
  async callWithRefreshRetry(queryFun) {
    return queryFun()
      .then(res => {
        return res
      })
      .catch(async err => {
        const errorAndCode = retrieveErrorAndDescription(err)
        if (errorAndCode && errorAndCode.code === 'unauthorized') {
          await this.refreshAndRetry(queryFun)
        } else {
          throw err
        }
      })
  }

  async refreshAndRetry(queryFun) {
    return this.refreshToken()
      .then(res => {
        if (res) {
          return queryFun()
        }
      })
      .catch(err => {
        console.log('error fetching dinos', err)
      })
  }

  getClient(secret) {
    const opts = { secret: secret, keepAlive: false }
    if (process.env.REACT_APP_LOCAL___FAUNADB_DOMAIN)
      opts.domain = process.env.REACT_APP_LOCAL___FAUNADB_DOMAIN
    if (process.env.REACT_APP_LOCAL___FAUNADB_SCHEME)
      opts.scheme = process.env.REACT_APP_LOCAL___FAUNADB_SCHEME
    if (process.env.REACT_APP_LOCAL___FAUNADB_PORT)
      opts.port = process.env.REACT_APP_LOCAL___FAUNADB_PORT
    opts.headers = { 'X-Fauna-Source': 'fauna-auth-skeleton-backend' }

    const client = new fauna.Client(opts)
    if (this.client) {
      // To ensure that the new client sees everything the old client saw.
      const lastTxTime = this.client.getLastTxnTime()
      client.syncLastTxnTime(lastTxTime)
    }
    return client
  }
}

const faunaAPI = new FaunaAPI()
export { faunaAPI }

import fauna from 'faunadb'
import * as backendAPI from './backend-api'
const q = fauna.query
const { Call } = q

class FaunaAPI {
  constructor() {
    this.client = new fauna.Client({
      secret: process.env.REACT_APP_LOCAL___PUBLIC_BOOTSTRAP_KEY
    })
    this.logout = this.logout.bind(this)
    this.getClient = this.getClient.bind(this)
    this.lastRefresh = null
  }

  /** ******* Authentication is delegated through the backend *********/
  async login(email, password) {
    return await backendAPI.login(email, password).then(loginResult => {
      this.client = this.getClient(loginResult.secret)
      this.lastRefresh = Date.now()
      return loginResult
    })
  }

  async logout(all) {
    return await backendAPI.logout()
  }

  async refreshToken() {
    return await backendAPI.refreshToken().then(res => {
      this.client = this.getClient(res.secret)
      return res
    })
  }

  async sendVerificationEmail(email) {
    return await backendAPI.sendVerificationEmail(email)
  }

  /** ******* Calls directly to Fauna*********/
  async verifyEmail(token) {
    const verificationClient = this.getClient(token)
    return verificationClient.query(Call('verify_account'))
  }

  async getDinos(user, loggedin) {
    if (loggedin && user && user.verified) {
      console.log('INFO - Retrieving dinos for logged in user with retry')
      return await this.callWithRefreshRetry(() => this.client.query(Call('get_all_dinos')))
    } else {
      console.log('INFO - Retrieving public dinos')
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
      .catch(async e => await this.refreshAndRetry(queryFun))
  }

  async refreshAndRetry(queryFun) {
    return this.refreshToken()
      .then(res => {
        if (res) {
          queryFun()
        }
      })
      .catch(err => {
        console.log('error fetching dinos', err)
      })
  }

  getClient(secret) {
    const opts = { secret: secret, keepAlive: false }
    if (process.env.FAUNADB_DOMAIN) opts.domain = process.env.FAUNADB_DOMAIN
    if (process.env.FAUNADB_SCHEME) opts.scheme = process.env.FAUNADB_SCHEME
    if (process.env.FAUNADB_PORT) opts.port = process.env.FAUNADB_PORT
    opts.headers = { 'X-Fauna-Source': 'fauna-auth-skeleton-backend' }
    return new fauna.Client(opts)
  }
}

const faunaAPI = new FaunaAPI()
export { faunaAPI }

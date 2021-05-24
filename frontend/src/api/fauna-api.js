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
    return await backendAPI.logout().then(res => {
      console.log('Logout result of API', res)
    })
  }

  async refreshToken() {
    return await backendAPI.refreshToken().then(res => {
      console.log('Refresh token result of API', res)
    })
  }

  async sendVerificationEmail(email) {
    return await backendAPI.sendVerificationEmail(email).then(res => {
      console.log('Send Verification email result of API', res)
    })
  }

  /** ******* Calls directly to Fauna*********/
  async verifyEmail(token) {
    const verificationClient = this.getClient(token)
    return verificationClient.query(Call('verify_account'))
  }

  async getDinos() {
    return await this.callWithRefreshRetry(() => this.client.query(Call('get_all_dinos'))).catch(
      err => {
        console.log('huh?')
        console.log('error fetching dinos', err)
      }
    )
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
      .then(res => (res ? (this.account = res.account) : queryFun()))
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

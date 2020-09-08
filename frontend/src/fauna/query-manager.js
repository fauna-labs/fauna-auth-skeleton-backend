import faunadb from 'faunadb'
import * as urljoin from 'url-join'

import { GetAllDinos } from '../../../fauna-queries/queries/dinos'

class QueryManager {
  constructor() {
    // Our frontend no longer needs access to our auth flow since that is done by calling our backend functions.
    // The frontend however could maybe require access to public data. In that case we provide a public bootstrap key.
    // which can either be a key that has access to a role providing access to that data
    // or could be a token for an 'anonymous' user (and we could check the membership of that user)
    // in our case we took the first option.

    // if you do not have public data: don't put a secret in the env files, no problem :)
    this.client = new faunadb.Client({
      secret: process.env.REACT_APP_LOCAL___PUBLIC_BOOTSTRAP_KEY
    })
    this.logout = this.logout.bind(this)
    this.logoutAll = this.logoutAll.bind(this)
    this.account = null
  }

  // Calling the login endpoint which will run the login
  // Fauna query from the backend and send use the token + set a httpOnly cookie for refreshing the token
  login(email, password) {
    return this.postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/login'), { email, password })
      .then(res => {
        if (res) {
          this.client = new faunadb.Client({ secret: res.secret })
          this.account = res.account
          return res.account
        }
        return res
      })
      .catch(err => {
        console.log('error calling frontend - login', err)
      })
  }

  // Calling the reset endpoint which will run the reset from the backend
  // which will send a reset email containing the reset token.
  reset(email) {
    return this.postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/reset'), {
      email
    }).catch(err => {
      console.log('error calling backend - reset', err)
      if (err.error) {
        throw err
      }
    })
  }

  // Calling the reset endpoint which will run the register from the backend
  // which will send a reset email containing the register token.
  register(email, password) {
    return this.postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/register'), {
      email,
      password
    }).catch(err => {
      console.log('error calling backend - register', err)
      if (err.error) {
        throw err
      }
    })
  }

  logout() {
    // We'll remove the refresh token (only this one, not one from anther device) from the cookie
    // which one is not accessible from the frontend so we'll do an API call.
    // At the same time we'll remove all access tokens linked to this refresh token.
    return this.postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/logout'), {})
      .then(res => {
        this.account = null
        this.client = new faunadb.Client({ secret: process.env.REACT_APP_LOCAL___PUBLIC_BOOTSTRAP_KEY })
        return res
      })
      .catch(err => console.log('error calling frontend - logout', err))
  }

  logoutAll() {
    // We'll remove the refresh token (only this one, not one from anther device) from the cookie
    // which one is not accessible from the frontend so we'll do an API call.
    // At the same time we'll remove all access tokens linked to this refresh token.
    return this.postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/logout?all=true'), {})
      .then(res => {
        this.account = null
        this.client = new faunadb.Client({ secret: process.env.REACT_APP_LOCAL___PUBLIC_BOOTSTRAP_KEY })
        return res
      })
      .catch(err => console.log('error calling frontend - logoutall', err))
  }

  // This endpoint will simply refresh the token by sending the httpOnly cookie to the backend which will
  // send us back the token.
  checkAccessOrRefresh() {
    return this.postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/refresh'), {})
      .then(res => {
        if (res && res.error) {
          return res
        } else {
          this.client = new faunadb.Client({ secret: res.secret })
          this.account = res.account
          return res.account
        }
      })
      .catch(err => console.log('error calling frontend - refresh', err))
  }

  changePassword(password, token) {
    return this.postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/password'), { password, token })
      .then(res => {
        if (res && res.error) {
          return res
        } else {
          this.client = new faunadb.Client({ secret: res.secret })
          this.account = res.account
          return res.account
        }
      })
      .catch(err => console.log('error calling frontend - refresh', err))
  }

  getDinos() {
    return this.wrapCallInRetry(() => this.client.query(GetAllDinos)).catch(err => {
      console.log('error fetching dinos', err)
    })
  }

  getAccount() {
    return this.account
  }

  async wrapCallInRetry(queryFun) {
    return queryFun()
      .then(res => {
        return res
      })
      .catch(e => {
        // check whether the server still has a valid access token.
        // it it doesn't we'll refresh it automatically.
        return this.checkAccessOrRefresh()
          .then(res => {
            if (res) {
              this.account = res.account
              return queryFun()
            }
          })
          .catch(err => {
            console.log('error fetching dinos', err)
          })
      })
    // First check if there is still a valid access token server-side
  }

  async postData(url, data = {}) {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      return response.json().then(err => {
        throw err
      })
    } else {
      return response.json()
    }
  }
}
const faunaQueries = new QueryManager()
export { faunaQueries }

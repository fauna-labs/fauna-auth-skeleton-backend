import * as urljoin from 'url-join'

export function register(email, password) {
  return postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'register'), {
    email,
    password
  })
}

export function login(email, password) {
  return postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'login'), { email, password })
}

export function logout(all) {
  return postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', `logout`), { all })
}

export function refreshToken() {
  return postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'refresh'), {})
}

// Calling the reset endpoint which will run the password reset from the backend
// which will send a reset email containing the reset token.
export function requestReset(email) {
  return postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/password/reset'), {
    email
  })
}

export function resetPassword(password, token) {
  return postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/password/reset'), {
    password,
    token
  })
}

export function resendVerificationEmail(email) {
  return postData(urljoin(process.env.REACT_APP_LOCAL___API, 'api', 'accounts/verify'), {
    email
  })
}

async function postData(url, data = {}) {
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

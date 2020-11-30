export const resetExpressSession = req => {
  req.session.refreshToken = null
  req.session.accessToken = null
  req.session.account = null
  req.session.destroy()
}

export const setExpressSession = (req, faunaRes) => {
  req.session.refreshToken = faunaRes.refresh.secret
  req.session.accessToken = faunaRes.access.secret
  req.session.account = faunaRes.account
}



const verifyAccessToken = async (client, accessToken) => {
    try {
        return await client.query(
            Call(q.Function('verify_token'), accessToken)
        )
    }
    // If that fails, it should fail with 'Instance not found'
    // which indicates that the token document cannot be retrieved
    // based on the secret
    // (the UDF uses the KeyFromSecret FQL function internally
    //  which will fail with that error message)
    catch(err){
        if (refreshErrorCode !== 'instance not found') {
            return res.json({ error: 'could not verify token' })
        }
        else {
            // we will log any other error and return false
            console.error(err)
            return false
        }
    }
}

export const verifyOrRefreshAccessToken = async (client, accessToken) => {
  console.log('INFO: verifying access token')

  // If there is no accessToken, we of course can't refresh the session
  if (!accessToken) {
    console.log('INFO - Session - there is no session active, cant refresh')
    return { error: 'no session' }
  }
  else {
      const verified = await verifyAccessToken(client, accessToken)
  }

  // If there is one, try to verify the token.
}



    .then(faunaRes => {
      // If the result is true, the token is still valid.
      if (faunaRes === true) {
        console.log('INFO: access token is valid')
        // since it's still valid we'll just return it to the frontend.
        return res.json({ secret: req.session.accessToken, account: req.session.account })
      } else {
        console.log('INFO: invalid, refreshing token')
        client.query(Call(q.Function('refresh_token'))).then(faunaRes => {
          refreshHandler(faunaRes)
        })
      }
      // Else it will receive a new token (if the refresh token was still valid)
    })
    .catch(err => {
      const refreshErrorCode = getRefreshErrorCode(err)
      if (refreshErrorCode === 'instance not found') {
        client
          .query(Call(q.Function('refresh_token')))
          .then(faunaRes => {
            refreshHandler(faunaRes)
          })
          .catch(err => {
            console.log('refresh failed', err)
          })
      } else {
        return res.json({ error: 'could not verify token' })
      }
    })
}

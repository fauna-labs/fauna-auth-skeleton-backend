export const resetExpressSession = req => {
  req.session.destroy()
}

export const setExpressSession = (req, faunaRes) => {
  console.log(faunaRes)
  req.session.refreshToken = faunaRes.tokens.refresh.secret
  req.session.accessToken = faunaRes.tokens.access.secret
  req.session.account = faunaRes.account.data
  req.session.created = Date.now()
}

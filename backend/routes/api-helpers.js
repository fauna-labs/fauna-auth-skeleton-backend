export const resetExpressSession = req => {
  req.session.destroy()
}

export const setExpressSession = (req, faunaRes) => {
  req.session.refreshToken = faunaRes.refresh.secret
  req.session.accessToken = faunaRes.access.secret
  req.session.account = faunaRes.account
}

import fauna from 'faunadb'

var lastClient = null

export function resetExpressSession(req) {
  req.session.destroy()
}

export function setExpressSession(req, faunaRes) {
  req.session.refreshToken = faunaRes.tokens.refresh.secret
  req.session.accessToken = faunaRes.tokens.access.secret
  req.session.account = faunaRes.account.data
  req.session.accessTokenLifetimeSeconds = faunaRes.accessTokenLifetimeSeconds
  req.session.created = Date.now()
}

export function setAccountExpressSession(req, account) {
  req.session.account = account.data
}

export function getClient(secret) {
  const opts = { secret: secret, keepAlive: false }
  if (process.env.FAUNADB_DOMAIN) opts.domain = process.env.FAUNADB_DOMAIN
  if (process.env.FAUNADB_SCHEME) opts.scheme = process.env.FAUNADB_SCHEME
  if (process.env.FAUNADB_PORT) opts.port = process.env.FAUNADB_PORT
  opts.headers = { 'X-Fauna-Source': 'fauna-auth-skeleton-backend' }

  const client = new fauna.Client(opts)
  if (lastClient) {
    // To ensure that the new client sees everything the old client saw.
    const lastTxTime = lastClient.getLastTxnTime()
    client.syncLastTxnTime(lastTxTime)
  }
  lastClient = client
  return client
}

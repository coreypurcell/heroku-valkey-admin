import { timingSafeEqual } from 'node:crypto'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'

const upstreamPort = 8080
const port = Number(process.env.PORT || upstreamPort)
const username = process.env.ADMIN_USERNAME
const password = process.env.ADMIN_PASSWORD

if (!username || !password) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set')
}

const expectedAuthorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`

const valkeyEnvironment = () => {
  if (!process.env.REDIS_URL) return {}

  const url = new URL(process.env.REDIS_URL)
  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error('REDIS_URL must use redis:// or rediss://')
  }
  if (!url.hostname || !url.port || !/^\/(|\d+)$/.test(url.pathname)) {
    throw new Error('REDIS_URL must include a host, port, and optional numeric database')
  }

  return {
    VALKEY_HOST: url.hostname,
    VALKEY_PORT: url.port,
    VALKEY_USERNAME: decodeURIComponent(url.username),
    VALKEY_PASSWORD: decodeURIComponent(url.password),
    VALKEY_DB: url.pathname.slice(1) || '0',
    VALKEY_TLS: String(url.protocol === 'rediss:'),
    VALKEY_VERIFY_CERT: 'false',
    VALKEY_AUTH_TYPE: 'password',
  }
}

const isAuthorized = (request) => {
  const authorization = request.headers.authorization
  if (typeof authorization !== 'string') return false

  const actual = Buffer.from(authorization)
  const expected = Buffer.from(expectedAuthorization)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const reject = (response) => {
  response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Valkey Admin"' })
  response.end('Authentication required')
}

const sanitizedHeaders = (headers) => {
  const { authorization, ...remaining } = headers
  return remaining
}

const upstream = spawn('node', ['apps/server/dist/index.js'], {
  cwd: '/app',
  env: { ...process.env, ...valkeyEnvironment(), PORT: String(upstreamPort) },
  stdio: 'inherit',
})

const server = http.createServer((request, response) => {
  if (!isAuthorized(request)) return reject(response)

  const proxy = http.request({
    hostname: '127.0.0.1',
    port: upstreamPort,
    method: request.method,
    path: request.url,
    headers: sanitizedHeaders(request.headers),
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
    upstreamResponse.pipe(response)
  })

  proxy.on('error', () => response.destroy())
  request.pipe(proxy)
})

server.on('upgrade', (request, socket, head) => {
  if (!isAuthorized(request)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="Valkey Admin"\r\n\r\n')
    socket.destroy()
    return
  }

  const upstreamSocket = net.connect(upstreamPort, '127.0.0.1', () => {
    const headers = sanitizedHeaders(request.headers)
    const requestHeaders = Object.entries(headers)
      .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\r\n')
    upstreamSocket.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${requestHeaders}\r\n\r\n`)
    if (head.length) upstreamSocket.write(head)
    socket.pipe(upstreamSocket).pipe(socket)
  })

  upstreamSocket.on('error', () => socket.destroy())
})

server.listen(port, () => console.log(`Authenticated proxy listening on ${port}`))

const shutdown = () => {
  server.close()
  upstream.kill('SIGTERM')
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

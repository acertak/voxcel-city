const encoder = new TextEncoder()
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60
const MAX_LOGIN_BODY_BYTES = 4096

export interface AppLoginEnv {
  readonly APP_LOGIN_USERNAME?: string
  readonly APP_LOGIN_PASSWORD?: string
  readonly APP_LOGIN_SESSION_SECRET?: string
}

export interface AppLoginBrand {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly accent: string
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const platformEqual = (crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (
      first: ArrayBuffer | ArrayBufferView,
      second: ArrayBuffer | ArrayBufferView,
    ) => boolean
  }).timingSafeEqual
  if (platformEqual) return platformEqual.call(crypto.subtle, left, right)
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

async function credentialsMatch(
  providedUsername: string,
  providedPassword: string,
  expectedUsername: string,
  expectedPassword: string,
): Promise<boolean> {
  const [provided, expected] = await Promise.all([
    digest(`${providedUsername}\u0000${providedPassword}`),
    digest(`${expectedUsername}\u0000${expectedPassword}`),
  ])
  return timingSafeEqual(provided, expected)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null
  try {
    const padded = value.replace(/-/gu, '+').replace(/_/gu, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=')
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

async function issueSessionToken(secret: string, appId: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `${appId}:${expiresAt}`
  return `${expiresAt}.${bytesToBase64Url(await hmac(secret, payload))}`
}

async function verifySessionToken(token: string, secret: string, appId: string): Promise<boolean> {
  const [expiresRaw, signatureRaw, ...rest] = token.split('.')
  if (rest.length > 0 || !/^\d{10}$/u.test(expiresRaw ?? '')) return false
  const expiresAt = Number(expiresRaw)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + SESSION_TTL_SECONDS) {
    return false
  }
  const provided = base64UrlToBytes(signatureRaw ?? '')
  if (!provided) return false
  const expected = await hmac(secret, `${appId}:${expiresAt}`)
  return timingSafeEqual(provided, expected)
}

function cookieValue(request: Request, name: string): string | null {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue
    return part.slice(separator + 1).trim()
  }
  return null
}

function cookieName(appId: string, secure: boolean): string {
  if (!/^[a-z][a-z0-9-]{0,40}$/u.test(appId)) throw new Error('Invalid application identifier.')
  return secure ? `__Host-${appId}_login` : `${appId}_login`
}

function safeNextPath(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.length > 2048) return '/'
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (character === '\\' || code <= 0x1f || code === 0x7f) return '/'
  }
  return value.startsWith('/login') ? '/' : value
}

function trustedMutation(request: Request): boolean {
  const origin = request.headers.get('Origin')
  const fetchSite = request.headers.get('Sec-Fetch-Site')
  return origin === new URL(request.url).origin && (!fetchSite || fetchSite === 'same-origin')
}

async function readBoundedForm(request: Request): Promise<URLSearchParams | null> {
  if (!/^application\/x-www-form-urlencoded(?:;|$)/iu.test(request.headers.get('Content-Type') ?? '')) {
    return null
  }
  if (!request.body) return new URLSearchParams()
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })
  let size = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_LOGIN_BODY_BYTES) {
        await reader.cancel('login body too large')
        return null
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    return new URLSearchParams(text)
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;').replace(/'/gu, '&#39;')
}

function responseHeaders(contentType = 'text/html; charset=utf-8'): Headers {
  return new Headers({
    'Cache-Control': 'private, no-store, no-transform',
    'Content-Type': contentType,
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  })
}

function loginPage(brand: AppLoginBrand, nextPath: string, failed = false): Response {
  const headers = responseHeaders()
  const body = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ログイン | ${escapeHtml(brand.title)}</title><style>:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#090b10;color:#fff}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 20%,${brand.accent}33,#090b10 64%)}main{width:min(100%,400px);padding:32px;border:1px solid ${brand.accent}88;border-radius:18px;background:#11151deF;box-shadow:0 24px 80px #000a}p{color:#c7ced9;line-height:1.7}.error{color:#ffaaa3}label{display:grid;gap:8px;margin-top:18px;font-size:14px}input{width:100%;padding:13px 14px;border:1px solid #596273;border-radius:9px;background:#080a0f;color:#fff;font:inherit}input:focus{outline:2px solid ${brand.accent};outline-offset:2px}button{width:100%;margin-top:24px;padding:14px;border:0;border-radius:9px;background:${brand.accent};color:#071018;font:700 16px system-ui;cursor:pointer}small{display:block;margin-top:18px;color:#818b9b}</style></head><body><main><h1>${escapeHtml(brand.title)}</h1><p>${escapeHtml(brand.subtitle)}</p>${failed ? '<p class="error" role="alert">ユーザー名またはパスワードが違います。</p>' : ''}<form method="post" action="/login?next=${encodeURIComponent(nextPath)}"><label>ユーザー名<input name="username" autocomplete="username" maxlength="128" required></label><label>パスワード<input name="password" type="password" autocomplete="current-password" maxlength="256" required></label><button type="submit">ログイン</button></form><small>認証状態はこの端末に7日間保存されます。</small></main></body></html>`
  return new Response(body, { status: failed ? 401 : 200, headers })
}

function configValid(env: AppLoginEnv): env is Required<AppLoginEnv> {
  return Boolean(
    env.APP_LOGIN_USERNAME?.trim()
      && env.APP_LOGIN_PASSWORD
      && env.APP_LOGIN_PASSWORD.length >= 10
      && /[a-z]/u.test(env.APP_LOGIN_PASSWORD)
      && /[A-Z]/u.test(env.APP_LOGIN_PASSWORD)
      && /[0-9]/u.test(env.APP_LOGIN_PASSWORD)
      && /[^A-Za-z0-9]/u.test(env.APP_LOGIN_PASSWORD)
      && env.APP_LOGIN_SESSION_SECRET
      && env.APP_LOGIN_SESSION_SECRET.length >= 32,
  )
}

export async function createAppLoginSessionCookie(
  env: AppLoginEnv,
  brand: AppLoginBrand,
  secure = true,
): Promise<string> {
  if (!configValid(env)) throw new Error('Application login is not configured.')
  const name = cookieName(brand.id, secure)
  const session = await issueSessionToken(env.APP_LOGIN_SESSION_SECRET, brand.id)
  return `${name}=${session}; ${secure ? 'Secure; ' : ''}HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
}

export async function enforceAppLogin(
  request: Request,
  env: AppLoginEnv,
  brand: AppLoginBrand,
): Promise<Response | null> {
  if (!configValid(env)) {
    return new Response('Application login is not configured.', {
      status: 503,
      headers: responseHeaders('text/plain; charset=utf-8'),
    })
  }
  const url = new URL(request.url)
  const secure = url.protocol === 'https:'
  const name = cookieName(brand.id, secure)
  const token = cookieValue(request, name)
  const authenticated = token
    ? await verifySessionToken(token, env.APP_LOGIN_SESSION_SECRET, brand.id)
    : false

  if (url.pathname === '/login' && request.method === 'GET') {
    if (authenticated) {
      return new Response(null, { status: 302, headers: { Location: safeNextPath(url.searchParams.get('next')) } })
    }
    return loginPage(brand, safeNextPath(url.searchParams.get('next')))
  }

  if (url.pathname === '/login' && request.method === 'POST') {
    if (!trustedMutation(request)) {
      return new Response('Invalid request origin.', {
        status: 403,
        headers: responseHeaders('text/plain; charset=utf-8'),
      })
    }
    const nextPath = safeNextPath(url.searchParams.get('next'))
    const form = await readBoundedForm(request)
    const username = form?.get('username') ?? ''
    const password = form?.get('password') ?? ''
    const matches = await credentialsMatch(
      username.slice(0, 129),
      password.slice(0, 257),
      env.APP_LOGIN_USERNAME,
      env.APP_LOGIN_PASSWORD,
    )
    if (!form || username.length > 128 || password.length > 256 || !matches) {
      return loginPage(brand, nextPath, true)
    }
    const sessionCookie = await createAppLoginSessionCookie(env, brand, secure)
    return new Response(null, {
      status: 303,
      headers: {
        Location: nextPath,
        'Cache-Control': 'private, no-store',
        'Set-Cookie': sessionCookie,
      },
    })
  }

  if (url.pathname === '/logout' && request.method === 'POST') {
    if (!trustedMutation(request)) {
      return new Response('Invalid request origin.', { status: 403, headers: responseHeaders('text/plain; charset=utf-8') })
    }
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/login',
        'Cache-Control': 'private, no-store',
        'Set-Cookie': `${name}=; ${secure ? 'Secure; ' : ''}HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
      },
    })
  }

  if (authenticated) return null
  if (request.method === 'GET' && (request.headers.get('Accept')?.includes('text/html') ?? false)) {
    const nextPath = safeNextPath(`${url.pathname}${url.search}`)
    return new Response(null, {
      status: 302,
      headers: { Location: `/login?next=${encodeURIComponent(nextPath)}`, 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    })
  }
  return new Response('Authentication required.', {
    status: 401,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  })
}

export function protectAuthenticatedResponse(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers)
  const vary = headers.get('Vary')
  if (!vary) headers.set('Vary', 'Cookie')
  else if (!vary.split(',').some((value) => value.trim().toLowerCase() === 'cookie')) {
    headers.set('Vary', `${vary}, Cookie`)
  }
  const contentType = headers.get('Content-Type') ?? ''
  if (pathname === '/' || pathname.endsWith('.html') || contentType.includes('text/html')) {
    headers.set('Cache-Control', 'private, no-store, no-transform')
  } else {
    const cacheControl = headers.get('Cache-Control')
    if (cacheControl?.includes('public')) headers.set('Cache-Control', cacheControl.replace(/\bpublic\b/iu, 'private'))
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

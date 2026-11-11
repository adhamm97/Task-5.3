import axios from 'axios'

// `withCredentials: true` makes the browser send (and store) the auth cookie on
// cross-origin requests to the API. The JWT is no longer kept in localStorage,
// so we pair it with a double-submit anti-CSRF token on every state-changing call.
export const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true
})

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const CSRF_EXEMPT_PATHS = ['/auth/login', '/auth/register']

let csrfToken = null
let csrfPromise = null

export function clearCsrfToken() {
  csrfToken = null
  csrfPromise = null
}

async function fetchCsrfToken() {
  if (csrfToken) return csrfToken
  if (!csrfPromise) {
    csrfPromise = api
      .get('/csrf-token')
      .then((res) => {
        csrfToken = res.data?.csrfToken || null
        return csrfToken
      })
      .finally(() => {
        csrfPromise = null
      })
  }
  return csrfPromise
}

function setHeader(headers, name, value) {
  if (typeof headers?.set === 'function') {
    headers.set(name, value)
  } else {
    headers[name] = value
  }
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'GET').toUpperCase()
  const url = config.url || ''
  const isExempt = CSRF_EXEMPT_PATHS.some((p) => url === p || url.endsWith(p))

  if (MUTATING_METHODS.has(method) && !isExempt) {
    const token = await fetchCsrfToken()
    if (token) {
      config.headers = config.headers || {}
      setHeader(config.headers, 'x-csrf-token', token)
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const url = response.config?.url || ''
    if (
      url.endsWith('/auth/login') ||
      url.endsWith('/auth/register') ||
      url.endsWith('/auth/logout')
    ) {
      clearCsrfToken()
    }
    return response
  },
  async (error) => {
    const original = error.config
    if (
      error.response?.status === 403 &&
      original &&
      !original._csrfRetried &&
      /csrf/i.test(error.response?.data?.message || '')
    ) {
      original._csrfRetried = true
      clearCsrfToken()
      const token = await fetchCsrfToken()
      if (token) {
        original.headers = original.headers || {}
        setHeader(original.headers, 'x-csrf-token', token)
      }
      return api(original)
    }
    return Promise.reject(error)
  }
)

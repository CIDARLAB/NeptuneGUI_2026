/**
 * Optional in-browser auth storage for demo when Neptune_2026 backend is not running.
 * Users are stored in localStorage (key: neptune_local_users).
 * Enable with VUE_APP_USE_LOCAL_AUTH=true in .env.development or .env.local.
 */

const STORAGE_KEY = 'neptune_local_users'

function getUsers () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

function saveUsers (users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

export function register (payload) {
  const { email, password } = payload || {}
  if (!email || !password) return Promise.reject(new Error('Email and password required'))
  const users = getUsers()
  if (users[email]) return Promise.reject(new Error('Email already registered'))
  const user = {
    _id: 'local_' + Date.now(),
    email,
    isLocal: true,
  }
  users[email] = { password, user }
  saveUsers(users)
  return Promise.resolve({ user })
}

export function login (payload) {
  const { email, password } = payload || {}
  if (!email || !password) return Promise.reject(new Error('Email and password required'))
  const users = getUsers()
  const record = users[email]
  if (!record || record.password !== password) return Promise.reject(new Error('Invalid email or password'))
  return Promise.resolve({ user: record.user })
}

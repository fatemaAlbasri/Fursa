const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token')
  const isForm = body instanceof FormData
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(isForm || !body ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: isForm ? body : body && JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw data
  // Something changed on the server the bell checks its unread count again
  if (method !== 'GET' && !path.startsWith('/notifications')) {
    window.dispatchEvent(new Event('fursa:data-changed'))
  }
  return data
}

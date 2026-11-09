// AI CV Optimizer calls. Same base URL and token as shared/api.js, but errors keep the HTTP status
// (the optimizer needs to tell 404 / 422 / 429 / 502 / 503 apart) and PDFs are downloaded as files.
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const authHeader = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const NETWORK_ERROR = { status: 0, error: 'Could not reach the server' }

// Throws { status, error, fields? }
async function request(path, { method = 'GET', body } = {}) {
  const isForm = body instanceof FormData
  let res
  try {
    res = await fetch(API + path, {
      method,
      headers: { ...(isForm || !body ? {} : { 'Content-Type': 'application/json' }), ...authHeader() },
      body: isForm ? body : body && JSON.stringify(body)
    })
  } catch {
    throw NETWORK_ERROR
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    // no JSON body
  }
  if (!res.ok) throw { status: res.status, error: data?.error || 'Something went wrong', fields: data?.fields }
  return data
}

export const getMe = () => request('/auth/me')
export const getReview = () => request('/cv/optimizer')
export const analyseCv = () => request('/cv/optimizer', { method: 'POST' })
export const setSuggestionStatus = (id, status) =>
  request(`/cv/optimizer/suggestions/${id}`, { method: 'PATCH', body: { status } })
// "card" is the only method the backend accepts (simulated payment, no card details are sent)
export const unlockReport = () => request('/cv/optimizer/unlock', { method: 'POST', body: { method: 'card' } })

export function uploadCv(file) {
  const data = new FormData()
  data.append('cv', file)
  return request('/cv', { method: 'POST', body: data })
}

// The PDF routes need the token, so they can't be plain links: fetch the file, then save it
export async function downloadPdf(path, fileName) {
  let res
  try {
    res = await fetch(API + path, { headers: authHeader() })
  } catch {
    throw NETWORK_ERROR
  }
  if (!res.ok) {
    let data = null
    try {
      data = await res.json()
    } catch {
      // no JSON body
    }
    throw { status: res.status, error: data?.error || 'Could not download the PDF' }
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Same rules as the backend upload (middleware/upload.js): PDF or Word, max 5 MB
export const CV_ACCEPT = '.pdf,.doc,.docx'
export const CV_MAX_BYTES = 5 * 1024 * 1024

export function checkCvFile(file) {
  if (!/\.(pdf|docx?)$/i.test(file.name)) return 'CV must be a PDF or Word file'
  if (file.size > CV_MAX_BYTES) return 'File is too big (max 5 MB)'
  return null
}

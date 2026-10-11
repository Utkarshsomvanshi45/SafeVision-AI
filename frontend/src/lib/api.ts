const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://safe-vision-ai-xi.vercel.app'
    : 'http://localhost:8000')

// SSR pe localStorage nahi hota
const getToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// Base fetch wrapper
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken()
  
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    throw new Error(`API Error: ${res.status}`)
  }

  return res.json()
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })
    if (!res.ok) throw new Error('Invalid credentials')
    return res.json()
  },

  getMe: () => apiFetch('/api/auth/me'),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getOverview: () => apiFetch('/api/dashboard/overview'),
}

// ── Violations ─────────────────────────────────────────────────────────────
export const violationsAPI = {
  getAll: (params?: { skip?: number; limit?: number; severity?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return apiFetch(`/api/violations${query ? '?' + query : ''}`)
  },
  getStats: () => apiFetch('/api/violations/stats'),
}

// ── Alerts ─────────────────────────────────────────────────────────────────
export const alertsAPI = {
  getAll: (params?: { status?: string; severity?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return apiFetch(`/api/alerts${query ? '?' + query : ''}`)
  },
  getStats: () => apiFetch('/api/alerts/stats'),
  update: (id: number, data: { status: string; notes?: string }) =>
    apiFetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  resolveAll: () =>
    apiFetch('/api/alerts/resolve-all', { method: 'PATCH' }),
}

// ── Cameras ────────────────────────────────────────────────────────────────
export const camerasAPI = {
  getAll: () => apiFetch('/api/cameras/'),
  update: (cameraId: string, data: any) =>
    apiFetch(`/api/cameras/${cameraId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// ── Compliance ─────────────────────────────────────────────────────────────
export const complianceAPI = {
  getAll: (params?: { status?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return apiFetch(`/api/compliance${query ? '?' + query : ''}`)
  },
  getStats: () => apiFetch('/api/compliance/stats'),
  update: (id: number, data: { status: 'accepted' | 'rejected' }) =>
    apiFetch(`/api/compliance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ── Settings ───────────────────────────────────────────────────────────────
export const settingsAPI = {
  getAll: () => apiFetch('/api/settings'),
  update: (data: Record<string, string>) =>
    apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getDetectionModules: () => apiFetch('/api/settings/detection-modules'),
  toggleModule: (violationType: string, isEnabled: boolean) =>
    apiFetch(`/api/settings/detection-modules/${violationType}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_enabled: isEnabled }),
    }),
}
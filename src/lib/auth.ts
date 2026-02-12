'use client'

import { useEffect, useState } from 'react'

const KEY = 'mektoub-token'
const LOGIN = 'Azzy01'
const PASS = 'Applecity11'

export function isAuthed(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.localStorage.getItem(KEY)
}

export function setAuthed(next: boolean, token?: string) {
  if (typeof window === 'undefined') return
  if (next && token) window.localStorage.setItem(KEY, token)
  else window.localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('mektoub-auth-changed'))
}

export async function tryLogin(login: string, pass: string): Promise<boolean> {
  if (login !== LOGIN || pass !== PASS) return false
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password: pass }),
  })
  if (!res.ok) return false
  const json = await res.json()
  if (!json?.token) return false
  setAuthed(true, json.token)
  return true
}

export function logout() {
  setAuthed(false)
}

export function useAuth() {
  const [authed, setAuthedState] = useState<boolean>(false)

  useEffect(() => {
    setAuthedState(isAuthed())
    const onChange = () => setAuthedState(isAuthed())
    window.addEventListener('mektoub-auth-changed', onChange)
    return () => window.removeEventListener('mektoub-auth-changed', onChange)
  }, [])

  return { authed }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(KEY)
}

'use client'

import { useEffect, useState } from 'react'

const KEY = 'mektoub-auth'
const LOGIN = 'Azzy01'
const PASS = 'Applecity11'

export function isAuthed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(KEY) === '1'
}

export function setAuthed(next: boolean) {
  if (typeof window === 'undefined') return
  if (next) window.localStorage.setItem(KEY, '1')
  else window.localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('mektoub-auth-changed'))
}

export function tryLogin(login: string, pass: string): boolean {
  if (login === LOGIN && pass === PASS) {
    setAuthed(true)
    return true
  }
  return false
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

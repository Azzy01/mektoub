'use client'

import { useEffect } from 'react'
import { syncNow } from '../../lib/sync'

export default function AutoSync() {
  useEffect(() => {
    let active = true
    const run = async () => {
      if (!active) return
      try {
        await syncNow()
      } catch {
        // ignore sync errors
      }
    }
    run()
    const onFocus = () => run()
    document.addEventListener('visibilitychange', onFocus)
    const id = window.setInterval(run, 60000)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onFocus)
      window.clearInterval(id)
    }
  }, [])

  return null
}

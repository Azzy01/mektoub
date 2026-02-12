'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout, tryLogin, useAuth } from '../../lib/auth'
import { syncNow } from '../../lib/sync'

function Tab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`px-3 py-2 border rounded-full text-sm transition ${
        active ? 'bg-white/20 border-white/30' : 'border-white/10 hover:bg-white/10'
      }`}
    >
      {label}
    </Link>
  )
}

export default function TopNav() {
  const { authed } = useAuth()
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="font-semibold text-lg mr-2 tracking-wide">Mektoub</div>
      <Tab href="/" label="Main" />
      <Tab href="/today" label="Today" />
      <Tab href="/calendar" label="Calendar" />
      <Tab href="/projects" label="Projects" />
      <Tab href="/blog" label="Blog" />
      <div className="ml-auto flex items-center gap-2 text-xs">
        {authed ? (
          <button
            className="border rounded px-2 py-1 hover:bg-white/10"
            onClick={() => logout()}
          >
            Lock
          </button>
        ) : (
          <button
            className="border rounded px-2 py-1 hover:bg-white/10"
            onClick={async () => {
              const login = prompt('Login')
              if (login == null) return
              const pass = prompt('Password')
              if (pass == null) return
              if (!(await tryLogin(login, pass))) {
                alert('Invalid credentials')
                return
              }
              await syncNow()
            }}
          >
            Unlock
          </button>
        )}
        {authed && (
          <button
            className="border rounded px-2 py-1 hover:bg-white/10"
            onClick={() => syncNow()}
          >
            Sync
          </button>
        )}
        <span className="opacity-60">Offline-first</span>
      </div>
    </div>
  )
}

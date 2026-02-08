'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Tab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`px-3 py-2 border rounded ${
        active ? 'bg-white/15 border-white/30' : 'border-white/10 hover:bg-white/10'
      }`}
    >
      {label}
    </Link>
  )
}

export default function TopNav() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="font-semibold text-lg mr-2">Mektoub</div>
      <Tab href="/" label="Main" />
      <Tab href="/projects" label="Projects" />
      <Tab href="/blog" label="Blog" />
      <div className="ml-auto text-xs opacity-60">Offline-first</div>
    </div>
  )
}

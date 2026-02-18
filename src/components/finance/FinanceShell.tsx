'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AppShell from '../shell/AppShell'

function FinanceTab(props: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === props.href
  return (
    <Link
      href={props.href}
      className={`block w-full text-left border rounded px-3 py-2 text-sm transition ${
        active ? 'bg-white/20 border-white/30' : 'border-white/10 hover:bg-white/10'
      }`}
    >
      {props.label}
    </Link>
  )
}

function FinanceSidebar() {
  return (
    <div className="space-y-2">
      <div className="font-semibold">Finance</div>
      <FinanceTab href="/finance" label="Book" />
      <FinanceTab href="/finance/dictionary" label="Dictionary" />
      <FinanceTab href="/finance/dashboard" label="Dashboard" />
    </div>
  )
}

export default function FinanceShell(props: { children: React.ReactNode }) {
  return <AppShell left={<FinanceSidebar />}>{props.children}</AppShell>
}

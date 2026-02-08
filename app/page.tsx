import AppShell from '../src/components/shell/AppShell'
import Home from '../src/components/home/Home'
import SidebarNotebooks from '../src/components/home/SidebarNotebooks'
import { useNotebooks } from '../src/components/home/hooks/useNotebooks'

// ❗app/page.tsx is a Server Component by default.
// So we cannot call hooks here.
// We'll wrap sidebar into a client component container.

import MainLeft from '../src/components/home/MainLeft'

export default function Page() {
  return (
    <AppShell left={<MainLeft />}>
      <Home />
    </AppShell>
  )
}

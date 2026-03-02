'use client'

import { logoutAction } from '@/lib/actions/auth'
import { useTransition } from 'react'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </button>
  )
}

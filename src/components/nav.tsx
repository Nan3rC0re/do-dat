import Link from 'next/link'
import { Inbox, Clock } from 'lucide-react'
import AvatarMenu from '@/components/avatar-menu'

interface NavProps {
  userEmail?: string | null
}

export default function Nav({ userEmail }: NavProps) {
  const initial = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border/50">
      {/* Logo — far left */}
      <Link href="/" className="flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 via-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path
              d="M20 6L9 17l-5-5"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Link>

      {/* Nav links + avatar — grouped on the right */}
      <div className="flex items-center gap-5">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
        >
          <Inbox className="w-4 h-4" />
          Inbox
        </Link>
        <Link
          href="/completed"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Clock className="w-4 h-4" />
          Completed
        </Link>
        <AvatarMenu initial={initial} email={userEmail} />
      </div>
    </nav>
  )
}

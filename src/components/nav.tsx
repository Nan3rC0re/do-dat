import Link from "next/link";
import { Inbox, Clock } from "lucide-react";
import AvatarMenu from "@/components/avatar-menu";
import Image from "next/image";

interface NavProps {
  userEmail?: string | null;
}

export default function Nav({ userEmail }: NavProps) {
  const initial = userEmail ? userEmail[0].toUpperCase() : "?";

  return (
    <nav className="flex items-center justify-between px-6 pt-3  border-border/50">
      <Link href="/">
        <Image src="/logo.svg" alt="logo" width={22} height={22} />
      </Link>

      {/* Nav links + avatar — grouped on the right */}
      <div className="flex items-center gap-5">
        <Link
          href="/"
          className="text-sm text-foreground hover:text-foreground/70 transition-colors"
        >
          Inbox
        </Link>
        <Link
          href="/completed"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Completed
        </Link>
        <AvatarMenu initial={initial} email={userEmail} />
      </div>
    </nav>
  );
}

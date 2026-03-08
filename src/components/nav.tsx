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
      <AvatarMenu initial={initial} email={userEmail} />
    </nav>
  );
}

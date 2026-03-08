"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/auth";

interface AvatarMenuProps {
  initial: string;
  email?: string | null;
}

export default function AvatarMenu({ initial, email }: AvatarMenuProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-7 h-7 shrink-0 rounded-full cursor-pointer bg-violet-500 flex items-center justify-center text-white text-xs font-semibold select-none hover:bg-violet-600 data-[state=open]:bg-violet-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1"
          aria-label="Account menu"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {email && (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {email}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={() => startTransition(() => logoutAction())}
          disabled={isPending}
          className="cursor-pointer"
        >
          {isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

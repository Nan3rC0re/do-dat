"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const filters = [
  { label: "Inbox", href: "/" },
  { label: "Today", href: "/today" },
  { label: "Incoming", href: "/incoming" },
  { label: "Completed", href: "/completed" },
];

export default function FilterNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 px-5 py-4 justify-center">
      {filters.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`py-2 px-3 text-sm rounded-full transition-colors ${
              isActive
                ? "bg-neutral-100 text-primary border-2 border-primary font-medium"
                : "text-muted-foreground hover:text-foreground bg-white border border-neutral-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { springs } from "@/lib/motion";

const filters = [
  { label: "Today", href: "/today" },
  { label: "Incoming", href: "/incoming" },
  { label: "Completed", href: "/completed" },
];

export default function FilterNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    filters.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  return (
    <div className="px-5 py-4 flex justify-center">
      <div className="inline-flex items-center gap-0.5 rounded-full bg-muted p-[3px] h-9">
        {filters.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="relative cursor-pointer px-3 py-1 text-sm font-medium rounded-full transition-colors duration-100 whitespace-nowrap focus-visible:outline-none"
              style={{ color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-background shadow-sm"
                  transition={springs.smooth}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

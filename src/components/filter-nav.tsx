"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const filters = [
  { label: "Inbox", href: "/" },
  { label: "Today", href: "/today" },
  { label: "Incoming", href: "/incoming" },
  { label: "Completed", href: "/completed" },
];

export default function FilterNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="px-5 py-4 flex justify-center">
      <Tabs value={pathname} onValueChange={(v) => router.push(v)}>
        <TabsList>
          {filters.map(({ label, href }) => (
            <TabsTrigger key={href} value={href}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

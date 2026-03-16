"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TodayDateSync() {
  const router = useRouter();

  useEffect(() => {
    function getLocalInfo() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // midnight local time as UTC ISO string
      d.setHours(0, 0, 0, 0);
      const start = d.toISOString();
      const end = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      return { dateStr, start, end };
    }

    function sync() {
      const { dateStr, start, end } = getLocalInfo();
      const params = new URLSearchParams(window.location.search);
      if (params.get("date") !== dateStr) {
        router.replace(
          `/today?date=${dateStr}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
      }
    }

    sync();

    // Re-sync at next local midnight
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(sync, midnight.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}

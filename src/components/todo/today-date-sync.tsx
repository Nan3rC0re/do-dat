"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Cookie TTL slightly over a day so it always covers the current day
const COOKIE_MAX_AGE = 60 * 60 * 25;

function getLocalInfo() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Compute local-midnight boundaries in UTC
  d.setHours(0, 0, 0, 0);
  const start = d.toISOString();
  const end = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
  return { dateStr, start, end };
}

function getCookieValue(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export default function TodayDateSync() {
  const router = useRouter();

  useEffect(() => {
    function sync() {
      const { dateStr, start, end } = getLocalInfo();
      const storedDate = getCookieValue("today-date");

      if (storedDate !== dateStr) {
        setCookie("today-date", dateStr);
        setCookie("today-start", encodeURIComponent(start));
        setCookie("today-end", encodeURIComponent(end));
        // Re-run the server component with the correct local date
        router.refresh();
      }
    }

    sync();

    // Re-sync at next local midnight so the page rolls over automatically
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(sync, midnight.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}

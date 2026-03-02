# do-dat

A premium task manager built with Next.js 16, Supabase, and Drizzle ORM.

## Setup

### 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Get your values from [supabase.com](https://supabase.com) → Project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `DATABASE_URL` — Transaction pooler URL (port **6543**), found in Settings → Database → Connection pooling

### 2. Database

Run `supabase/schema.sql` in your Supabase SQL editor to create the `tasks` table, enum, and RLS policies.

Or push with Drizzle (requires `DATABASE_URL`):

```bash
npx drizzle-kit push
```

### 3. Auth settings

In Supabase → Authentication → Settings: **disable** email confirmation so users can sign in immediately after signing up.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **Supabase** (Auth + Postgres + RLS)
- **Drizzle ORM** + `postgres` driver (Connection Pooler)
- **Tailwind CSS** + **shadcn/ui**
- **motion** (from `motion/react`) — spring animations
- **Web Audio API** — synthesized sounds (no files, no deps)
- **sonner** — toasts

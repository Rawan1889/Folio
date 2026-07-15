# Folio

Multi-tenant hotel management platform. Every stay, on record.

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres, Storage) · Recharts

## Features

- Multi-tenant: each hotel brand has its own account; super admin sees all
- Rooms with image & video upload
- Bookings, guests, finance, reports
- Mobile-responsive dashboard
- Row-level security on every table

## Setup

```bash
npm install
cp .env.local.example .env.local  # add your Supabase URL and anon key
npm run dev
```

Then run `supabase/migrations/0001_init.sql` in the Supabase SQL editor.

## Brand

- Palette: Obsidian `#0a0a0f` · Amber `#C8A84B` · Cream `#F0EDE6`
- Typography: DM Sans

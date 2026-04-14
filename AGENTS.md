# unsaid — Repository Guide

## What It Is
Anonymous ephemeral expression platform for LPU campus. Posts start with 60min life, extended by reactions (+10m) and replies (+5m). Posts surviving 24h+ become "Campus Legends".

## Tech Stack
- **Framework**: Next.js 16 (App Router, React 19, Turbopack)
- **DB**: PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)
- **Real-time**: Ably (WebSocket)
- **Security**: Arcjet (rate limiting + bot detection)
- **Identity**: Cookie-based anonymous device IDs + FingerprintJS
- **Styling**: Tailwind CSS 4 + custom CSS vars (dark mode via `data-theme` attribute)
- **Animation**: Framer Motion
- **Deployment**: Vercel with daily cleanup cron

## Build & Run
```bash
npm install
npx prisma generate    # generates client to src/generated/prisma
npx prisma db push     # push schema to DB
npm run dev            # dev server
npm run build          # production build
```

## Key Architecture Decisions
- **Dark mode**: Uses `html[data-theme]` attribute + CSS custom properties in `@layer base` (required for Tailwind v4 compatibility)
- **Auth**: No traditional auth — anonymous device IDs via middleware cookie
- **Reactions**: 6 types (felt, dead, rage, pain, fire, real) — one per user per post
- **Pagination**: Cursor-based using post IDs
- **Real-time**: Ably channels per post for reactions + replies, global feed channel for new posts
- **Offline**: Posts queued in localStorage, flushed on reconnect
- **PWA**: Service worker in `public/sw.js`, manifest in `public/manifest.json`

## Important Files
- `prisma/schema.prisma` — data models (User, Post, FeltThis, Reply)
- `src/lib/constants.ts` — all magic numbers, reaction types, locations
- `src/lib/darkmode.tsx` — DarkModeProvider context
- `src/lib/auth.ts` — device-based anonymous auth
- `src/lib/ably.ts` — Ably client (browser singleton + server REST)
- `src/lib/seo.ts` — central SEO config (site URL, meta defaults, JSON-LD schemas)
- `src/app/globals.css` — ALL styles (dark mode vars in `@layer base`)
- `src/app/opengraph-image.tsx` — dynamic OG image for homepage (edge runtime)
- `src/app/post/[id]/opengraph-image.tsx` — dynamic OG image per post
- `src/app/robots.ts` — programmatic robots.txt
- `src/app/sitemap.ts` — dynamic sitemap with live posts

## Env Variables
- `DATABASE_URL` — PostgreSQL connection string
- `DIRECT_URL` — Direct DB connection for migrations
- `NEXT_PUBLIC_ABLY_KEY` — Ably subscribe key (client)
- `ABLY_API_KEY` — Ably root key (server publish)
- `ARCJET_KEY` — Arcjet rate limiting
- `CLEANUP_SECRET` — Cron cleanup auth
- `NEXT_PUBLIC_SITE_URL` — canonical site URL (defaults to `https://unsaid-pi.vercel.app`)

## SEO Architecture
- `src/lib/seo.ts` — single source of truth for site URL, metadata defaults, JSON-LD schemas
- Root layout exports comprehensive `metadata` with metadataBase, OG, Twitter, robots, keywords
- Title template: `%s | unsaid` (pages set their own title, root appends brand)
- Dynamic OG images via `next/og` ImageResponse (edge runtime)
- Post OG images fetch data from `/api/posts/[id]/og` lightweight endpoint
- robots.txt blocks /api/, /settings, /compose from crawlers
- sitemap.xml includes static pages + up to 200 live posts
- JSON-LD: WebApplication on root, SocialMediaPosting on post detail
- Security headers in next.config.ts (HSTS, X-Frame-Options, etc.)
- `X-Powered-By` header removed
- Private pages (feed, compose) have `robots: { index: false }`

## Known Patterns
- All API routes use `request as any` cast for Arcjet typing compatibility
- Tailwind v4 `@theme` block only for fonts; color vars go in `@layer base`
- Static pages (settings, verify) use client components; feed/compose use server+client split
- OG images use edge runtime — cannot import Prisma directly, must fetch from API

# unsaid

**say the thing you didn't.**

an anonymous, ephemeral expression platform. no profiles. no followers. no history. just the raw thing you've been carrying — out into the world, gone in 48 hours.

---

## what it is

every person walking around carries things they never said. to their ex. to their parents. to their best friend. to themselves.

unsaid is where those things go.

you open it. you write what you actually feel. it goes out anonymously. someone somewhere reads it and resonates — or doesn't. the post disappears in 48 hours. nothing is permanent. nothing haunts you.

## what makes it different

every existing platform has one fatal flaw — it remembers everything and attaches it to you. twitter remembers. reddit remembers. instagram remembers.

unsaid doesn't. there's no username. no profile. no post history. you're posting as nobody, and that's the point.

## features

- **ephemeral posts** — everything disappears in 48 hours
- **"felt this" reactions** — no likes, no comments, just resonance
- **city + university tags** — 60+ indian cities, 250+ universities
- **3-section feed** — your city → across india → everyone felt this (black zone)
- **real-time updates** — felt counts update live via websockets
- **zero identity** — no usernames, no profiles, no history
- **settings** — change your location or delete your account anytime

## the feed

| section | what it shows |
|---|---|
| **your city** | posts from your city + all universities in it |
| **across india** | posts from every other city |
| **everyone felt this** | posts with 50+ felt — the black zone, any city |

## tech stack

| layer | tech |
|---|---|
| framework | Next.js 16 (App Router, Turbopack) |
| database | Neon Serverless Postgres |
| orm | Prisma 7 (driver adapter) |
| auth | Clerk (Google, Magic Link) |
| real-time | Ably |
| rate limiting | Arcjet |
| animations | Framer Motion |
| deployment | Vercel |

## running locally

```bash
# clone
git clone https://github.com/ixchio/unsaid.git
cd unsaid

# install
npm install

# set up env
cp .env.example .env.local
# fill in your Clerk, Neon, Ably, and Arcjet keys

# push schema to database
npx prisma db push

# run
npm run dev
```

## env variables

| variable | description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection (for migrations) |
| `NEXT_PUBLIC_ABLY_KEY` | Ably subscribe-only key |
| `ABLY_API_KEY` | Ably root key (server-side publish) |
| `ARCJET_KEY` | Arcjet rate limiting key |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL |
| `CLEANUP_SECRET` | Secret for the cleanup cron endpoint |

## philosophy

the product is defined by its constraints:

- **no usernames** — identity creates performance
- **no comments** — responses create arguments
- **no post history** — permanence creates fear
- **48-hour expiry** — urgency creates honesty
- **"felt this" only** — resonance without engagement metrics

the gap between what people actually feel and what they're allowed to express is the entire product.

---

*posting as nobody.*

# 75 Grind

A 75-day workout challenge tracker. Everyone runs their own solo board,
all synced to one shared leaderboard, no accounts, no Anthropic
dependency, no API key.

## Run it locally

```
npm install
npm run dev
```

Opens at http://localhost:5173

## Deploy to Vercel

**Easiest way (no git needed):**
1. Run `npm run build` — this creates a `dist/` folder
2. Go to vercel.com, drag the whole project folder onto the dashboard
3. Vercel auto-detects it's a Vite app and deploys it

**Better way (so future edits redeploy automatically):**
1. Push this folder to a new GitHub repo
2. Go to vercel.com → Add New Project → import that repo
3. Vercel auto-detects Vite, no config needed. Deploy.

## How sharing works

The first person to open the deployed URL triggers the app to create a
free shared data board (via jsonstorage.net, no signup) and rewrites
the page URL to include `?board=<id>`. **Share that resulting URL**,
not the bare one, everyone who opens it lands on the same shared
data. It's saved locally too, so reopening the bare URL on the same
device still finds it.

## What's using what

- **UI**: React, Tailwind (via CDN script in `index.html`)
- **Icons**: lucide-react
- **Weight chart**: recharts
- **Shared data**: jsonstorage.net (free, keyless, third-party — not
  Anthropic, no uptime guarantee, works well for a friend-group tracker)
- **Personal/device data** (which profile is "you" on this device):
  browser localStorage

## Notes

- `src/App.jsx` has all the app logic and UI.
- `src/storage.js` is the only file wiring up the backend. If you ever
  want to swap in a different backend (Supabase, Firebase, your own
  API), this is the one file to change — the rest of the app just
  calls `window.storage.get/set/delete` and doesn't care what's behind it.

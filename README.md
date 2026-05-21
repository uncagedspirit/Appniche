# AppNiche — App Market Intelligence Tool

A production-grade SaaS for app developers and founders to research keywords, analyze competitors, find niche opportunities, and generate AI-powered app ideas.

**No paid subscriptions required. All data from public sources.**

---

## Features

| Feature | Description |
|---|---|
| 🔍 Keyword Research | 100+ keywords via Play Store + App Store autocomplete, A-Z expansion, difficulty scoring |
| 🧭 Niche Explorer | 40+ categories ranked by opportunity score |
| 📱 App Analyzer | Full metadata, reviews, update history, similar apps |
| 🤖 Gap Analyzer | Claude AI reads 150 reviews → finds pain points and missing features |
| 💡 Idea Generator | 3 scoped app ideas with features, monetization, ASO keywords |
| ⚡ ASO Optimizer | Optimized titles, descriptions, keywords for both stores |
| 💾 Saved Items | Firebase-backed collections, tracked apps, saved ideas |
| 🌍 Multi-Country | US, UK, India, Germany, Brazil, Japan + more |

---

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore (free tier — no credit card)
- **Auth**: Firebase Auth with Google sign-in
- **App Store Data**: `google-play-scraper` + `app-store-scraper` (no API key needed)
- **AI**: Claude Sonnet via Anthropic API

---

## Setup (15 minutes)

### Step 1: Firebase (Free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore Database** (start in production mode)
4. Enable **Authentication** → Sign-in method → Google
5. Go to Project Settings → Your apps → Add web app
6. Copy the config values

**Paste your Firestore rules** (from `firestore.rules`):
- Firestore → Rules → paste the contents of `firestore.rules` → Publish

### Step 2: Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add it to `backend/.env` as `ANTHROPIC_API_KEY`

### Step 3: Environment Variables

**Backend** — copy `backend/.env.example` to `backend/.env`:
```
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:5173
```

**Frontend** — copy `frontend/.env.example` to `frontend/.env`:
```
VITE_API_URL=/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Step 4: Install & Run

```bash
# Install root dependencies
npm install

# Install all packages
npm run install:all

# Run both backend and frontend together
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

### Backend → Railway (free)
1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New project → Deploy from GitHub
3. Select the `backend` folder
4. Add environment variables in Railway dashboard
5. Copy the Railway URL

### Frontend → Vercel (free)
1. Go to [vercel.com](https://vercel.com) → New project → Import from GitHub
2. Set root directory to `frontend`
3. Add env variables including `VITE_API_URL=https://your-railway-url.railway.app/api`
4. Deploy

---

## Project Structure

```
appniche/
├── backend/
│   ├── src/
│   │   ├── index.js           # Express app entry
│   │   ├── routes/
│   │   │   ├── keywords.js    # Keyword suggestions, expansion, difficulty
│   │   │   ├── apps.js        # Search, detail, reviews, similar
│   │   │   ├── niches.js      # Category analysis, opportunities
│   │   │   └── analysis.js    # Gap analysis, ideas, ASO (Claude AI)
│   │   └── services/
│   │       └── cache.js       # In-memory cache (1hr TTL)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Sidebar nav
│   │   │   └── UI.jsx         # Shared components
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── api.js         # Backend API client
│   │   │   ├── db.js          # Firebase operations
│   │   │   └── firebase.js    # Firebase init
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── KeywordResearch.jsx
│   │   │   ├── NicheExplorer.jsx
│   │   │   ├── AppAnalyzer.jsx
│   │   │   ├── IdeaGenerator.jsx
│   │   │   ├── ASOOptimizer.jsx
│   │   │   └── SavedItems.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── firestore.rules
├── package.json
└── README.md
```

---

## API Endpoints

### Keywords
- `GET /api/keywords/suggest?q=habit&country=us` — Play + App Store suggestions
- `GET /api/keywords/expand?q=habit&country=us` — Full A-Z expansion (100+ keywords)
- `GET /api/keywords/difficulty?keywords=habit,fitness&country=us` — Competition scores

### Apps
- `GET /api/apps/search?q=habit+tracker&platform=android&country=us` — Search
- `GET /api/apps/detail?appId=com.example&platform=android` — Full details
- `GET /api/apps/reviews?appId=com.example&num=100` — Reviews
- `GET /api/apps/similar?appId=com.example` — Similar apps
- `GET /api/apps/top?category=HEALTH_AND_FITNESS&collection=TOP_FREE` — Top charts

### Niches
- `GET /api/niches/categories` — All 40 categories
- `GET /api/niches/analyze?category=HEALTH_AND_FITNESS&country=us` — Category analysis
- `GET /api/niches/opportunities?country=us` — Ranked opportunity scan

### Analysis (AI)
- `POST /api/analysis/gaps` `{ appId, platform, niche }` — Gap analysis via Claude
- `POST /api/analysis/idea` `{ niche, gaps, keywords, competitorApps }` — App idea generation
- `POST /api/analysis/competitor-matrix` `{ appIds, platform }` — Competitive matrix
- `POST /api/analysis/aso-optimize` `{ appName, description, targetKeywords }` — ASO metadata

---

## Notes

- All app store data is scraped from public pages — no API key needed
- Results are cached for 1 hour to avoid rate limiting
- The Anthropic API key is only used server-side (never exposed to browser)
- Firebase free tier: 50,000 reads/day, 20,000 writes/day — more than enough
- Google sign-in is free for up to 10,000 MAUs on Firebase

---

## License

MIT

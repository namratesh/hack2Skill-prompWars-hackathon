# Travel Planning Experience Engine

A dynamic AI-powered travel planner. Living itineraries — not static documents.

## Quick Start

### Backend
```bash
cd backend && cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend && cp .env.local.example .env.local
npm install && npm run dev
```

## API Keys Needed
| Key | Source | Free? |
|---|---|---|
| `OPENROUTER_API_KEY` | openrouter.ai | $5 free credits |
| `OPENWEATHER_API_KEY` | openweathermap.org | 1M calls/month |
| Supabase keys | supabase.com | Free tier |

## Deploy
- Frontend → Vercel (`npx vercel --cwd frontend`)
- Backend → Render (use `deployment/render.yaml`)
# CourtVision Analytics

CourtVision Analytics is an MVP NBA analytics dashboard built with React, Vite, Tailwind CSS, Recharts, and FastAPI. The app lets users search NBA players, compare two players side-by-side, explore season trends, and discover statistically similar players.

## Features

- Search NBA players by name
- Display player profile info and latest season stats
- Compare two players with side-by-side stat cards
- Highlight leaders in key categories
- Visualize trends with line charts for points, rebounds, assists, and efficiency
- Find top 5 statistically similar players using normalized season stats
- Local cache for NBA API responses to reduce repeat fetch times

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Recharts
- Backend: Python, FastAPI
- Data: `nba_api`
- Caching: local JSON cache, DynamoDB, or S3
- AWS-ready deployment: S3/CloudFront frontend, ECS Fargate backend, DynamoDB cache

## Project Structure

- `/frontend` – React user interface
- `/backend` – FastAPI backend and caching logic

## AWS Architecture

- Frontend static hosting: Amazon S3 with CloudFront
- Backend compute: FastAPI on Elastic Beanstalk now; ECS Fargate-ready Dockerfile included
- Cache storage: DynamoDB with TTL, or S3 JSON object cache
- Infrastructure template: `infra/cloudformation/courtvision-web.yml`
- Backend infrastructure template: `infra/cloudformation/courtvision-backend-eb.yml`
- Deployment helper: `scripts/deploy-frontend-s3.ps1`
- Full notes: `docs/aws-architecture.md`

## Setup

### Backend

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

2. Run the backend server:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Run the development server:

```bash
npm run dev -- --host
```

3. Open the local Vite URL shown in the terminal.

## Usage

- Go to the Search page to find NBA players.
- Click a player to load profile info and latest season stats.
- Use the Compare page to select and compare two players.
- Use Trends to visualize seasonal performance.
- Use Similar to discover players with a close statistical profile.

## Notes

- The backend caches player lists and player season stats in `backend/cache/` by default.
- Set `COURTVISION_CACHE_BACKEND=dynamodb` or `COURTVISION_CACHE_BACKEND=s3` to use AWS-backed cache storage.
- If `nba_api` data changes or new players are added, delete the cache files and restart the backend.
- See `docs/aws-architecture.md` for the AWS migration plan and deployment commands.

## Future Improvements

- Add game-by-game trend detail for current season
- Use SQLite caching for faster local persistence
- Add player headshots and team logos
- Improve search autocomplete and filtering
- Add sorting and advanced comparison metrics

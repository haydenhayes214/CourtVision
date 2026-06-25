# CourtVision AWS Architecture

CourtVision can run locally with file-based cache and deploy to AWS with managed services.

## Target Architecture

- Frontend: React/Vite static build hosted in Amazon S3 and distributed with Amazon CloudFront.
- Backend: FastAPI deployed to Elastic Beanstalk now, with an ECS Fargate-ready Dockerfile for a later container migration.
- Cache: DynamoDB for structured API response caching with TTL, with S3 overflow storage for large JSON payloads.
- Logs: Amazon CloudWatch logs from the ECS task.
- CI/CD: GitHub Actions can build the frontend, sync `frontend/dist` to S3, build the backend image, push it to ECR, and update the ECS service.

## Cache Backends

Set `COURTVISION_CACHE_BACKEND` in the backend environment:

- `local`: stores JSON files in `backend/cache`. Best for local development.
- `dynamodb`: stores cached payloads in DynamoDB using `cache_key` as the partition key and `expires_at` for TTL.
- `s3`: stores cached JSON envelopes in S3 under `COURTVISION_S3_CACHE_PREFIX`.

Recommended production option: `dynamodb`.

S3 is still useful in this project for the frontend hosting path, and can also be used as an object cache if you want to demonstrate S3 SDK usage from Python.

## DynamoDB Table

Create a table:

- Table name: `courtvision-cache`
- Partition key: `cache_key` string
- TTL attribute: `expires_at`

The backend stores each cached response as:

```json
{
  "cache_key": "stats_2544",
  "payload": "{...json string...}",
  "expires_at": 1790000000
}
```

## S3 Frontend Hosting

Create the AWS frontend/cache resources:

```powershell
aws cloudformation deploy `
  --stack-name courtvision-web `
  --template-file infra/cloudformation/courtvision-web.yml `
  --capabilities CAPABILITY_NAMED_IAM
```

Build and upload the frontend:

```powershell
.\scripts\deploy-frontend-s3.ps1 -BucketName courtvision-frontend-your-name
```

If using CloudFront:

```powershell
.\scripts\deploy-frontend-s3.ps1 -BucketName courtvision-frontend-your-name -DistributionId ABC123EXAMPLE
```

For a production-quality setup, keep the S3 bucket private and use CloudFront origin access control.

If CloudFront is blocked while the AWS account is being verified, use the S3 website fallback:

```powershell
aws cloudformation deploy `
  --stack-name courtvision-s3-website `
  --template-file infra/cloudformation/courtvision-s3-website.yml
```

## Backend Container

Build locally:

```powershell
docker build -t courtvision-api ./backend
```

Run locally:

```powershell
docker run --rm -p 8000:8000 --env-file backend/.env.example courtvision-api
```

For AWS, push this image to Amazon ECR and run it as an ECS Fargate service.

## Elastic Beanstalk Backend

The current deployed backend uses Elastic Beanstalk because local Docker is not installed on this machine.

Deploy or update the backend:

```powershell
aws cloudformation deploy `
  --stack-name courtvision-backend-eb `
  --template-file infra/cloudformation/courtvision-backend-eb.yml `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides `
    SourceBucket=courtvision-cache-628786078011-us-east-1 `
    SourceKey=deployments/courtvision-api-VERSION.zip `
    CacheTableName=courtvision-cache `
    S3CacheBucketName=courtvision-cache-628786078011-us-east-1
```

The backend uses:

- Elastic Beanstalk Python 3.12
- `backend/Procfile` to start `uvicorn`
- DynamoDB for small cached responses
- S3 overflow for large cached responses such as the NBA players list

## Environment Variables

Frontend:

- `VITE_API_BASE`: deployed API URL

Backend:

- `COURTVISION_CACHE_BACKEND`: `local`, `dynamodb`, or `s3`
- `COURTVISION_CACHE_TTL_SECONDS`: cache lifetime in seconds
- `COURTVISION_DYNAMODB_TABLE`: DynamoDB table name
- `COURTVISION_S3_CACHE_BUCKET`: S3 bucket for object cache mode
- `COURTVISION_S3_CACHE_PREFIX`: S3 key prefix for object cache mode

## Portfolio Talking Points

- Migrated a local FastAPI/React MVP to AWS-ready architecture.
- Containerized FastAPI for ECS Fargate deployment.
- Replaced local file cache with pluggable cloud cache backends.
- Used DynamoDB TTL to expire NBA API responses automatically.
- Hosted React SPA with S3 and CloudFront.
- Added environment-driven configuration for local and cloud deployments.

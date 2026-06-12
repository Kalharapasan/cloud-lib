# Cloud Lib — AWS Deployment Guide

Complete step-by-step guide to deploy Cloud Lib to AWS.

---

## Architecture

```
Browser
  │
  ├─ HTTPS ──► CloudFront CDN ──► S3 (React frontend)
  │
  └─ HTTPS ──► Application Load Balancer
                     │
                     ▼
              Elastic Beanstalk  (Node.js 20)
                     │
                     ├──► Amazon RDS MySQL 8.0
                     └──► Amazon SNS (overdue alerts)
```

---

## Prerequisites

Before you begin, install and configure:

| Tool | Install | Verify |
|---|---|---|
| **AWS CLI v2** | https://aws.amazon.com/cli/ | `aws --version` |
| **Node.js 20** | https://nodejs.org/ | `node --version` |
| **Git** | https://git-scm.com/ | `git --version` |
| **jq** | https://jqlang.github.io/jq/ | `jq --version` |

Configure the AWS CLI:
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (ap-southeast-1), Output (json)
```

---

## Step 1 — Create an IAM User for Deployments

1. Open **AWS Console → IAM → Users → Create user**
2. Name: `cloud-lib-deploy`
3. Select **Programmatic access**
4. Attach the `AdministratorAccess` policy *(for initial setup; restrict later)*
5. Save the **Access Key ID** and **Secret Access Key** — you'll need them for GitHub Secrets

---

## Step 2 — Run the One-Time Setup Script

This script creates all AWS resources automatically:

```bash
# From the project root
chmod +x aws/setup.sh

# Set your alert email before running
export ALERT_EMAIL="your-email@university.edu"
./aws/setup.sh
```

The script will print a summary like this — **save these values**:

```
AWS_REGION                = ap-southeast-1
S3_BUCKET_FRONTEND        = cloud-lib-frontend-1749123456
S3_BUCKET_EB_DEPLOY       = cloud-lib-eb-deploy-1749123457
CLOUDFRONT_DISTRIBUTION_ID = EXXXXXXXXXXXXX
EB_APPLICATION_NAME       = cloud-lib
EB_ENVIRONMENT_NAME       = cloud-lib-prod
SNS_TOPIC_ARN             = arn:aws:sns:ap-southeast-1:123456789:CloudLibOverdueAlerts
```

---

## Step 3 — Confirm SNS Email Subscription

AWS sends a confirmation email to `$ALERT_EMAIL`.

1. Open your inbox
2. Click **"Confirm subscription"**
3. Done — you'll now receive overdue book alerts

---

## Step 4 — Create Amazon RDS MySQL Database

1. **AWS Console → RDS → Create database**
2. Settings:

   | Setting | Value |
   |---|---|
   | Engine | MySQL 8.0 |
   | Template | Free tier *(for dev)* / Production *(for prod)* |
   | DB identifier | `cloud-lib-db` |
   | Username | `admin` |
   | Password | Choose a strong password — save it! |
   | Instance class | `db.t3.micro` *(free tier)* |
   | Storage | 20 GiB gp2 |
   | Multi-AZ | No *(free tier)* / Yes *(production)* |
   | Public access | **No** *(backend connects via VPC)* |
   | VPC | Default VPC |

3. After creation, copy the **Endpoint** (looks like `cloud-lib-db.xxxxxxxxx.ap-southeast-1.rds.amazonaws.com`)

4. **Run the schema** from your local machine (first time only):

```bash
# Allow your local IP temporarily via RDS security group
mysql -h <RDS_ENDPOINT> -u admin -p cloud_lib < database/schema.sql
echo "Schema applied successfully!"
```

---

## Step 5 — Create Elastic Beanstalk Environment

1. **AWS Console → Elastic Beanstalk → Create environment**
2. Settings:

   | Setting | Value |
   |---|---|
   | Environment tier | Web server |
   | Application name | `cloud-lib` |
   | Environment name | `cloud-lib-prod` |
   | Platform | Node.js 20 |
   | Application code | Sample application *(CI/CD will replace it)* |
   | Instance type | `t3.small` |
   | Load balancer | Application Load Balancer |

3. Under **Configuration → Software → Environment properties**, add:

   | Key | Value |
   |---|---|
   | `PORT` | `5000` |
   | `NODE_ENV` | `production` |
   | `DB_HOST` | *Your RDS endpoint* |
   | `DB_PORT` | `3306` |
   | `DB_NAME` | `cloud_lib` |
   | `DB_USER` | `admin` |
   | `DB_PASSWORD` | *Your RDS password* |
   | `JWT_SECRET` | *A random 64-character string* |
   | `FRONTEND_URL` | *Your CloudFront HTTPS URL* |
   | `AWS_REGION` | `ap-southeast-1` |
   | `SNS_TOPIC_ARN` | *Your SNS topic ARN* |

4. Note the **EB environment URL** — needed for `VITE_API_BASE_URL`

---

## Step 6 — Set Security Group Rules

Allow Elastic Beanstalk EC2 instances to reach RDS:

1. **RDS → Security group → Inbound rules → Add rule**
   - Type: `MySQL/Aurora`
   - Source: *EB instance security group*

---

## Step 7 — Add GitHub Secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

Add each of the following:

| Secret Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | `ap-southeast-1` |
| `S3_BUCKET_FRONTEND` | From setup.sh output |
| `S3_BUCKET_EB_DEPLOY` | From setup.sh output |
| `CLOUDFRONT_DISTRIBUTION_ID` | From setup.sh output |
| `EB_APPLICATION_NAME` | `cloud-lib` |
| `EB_ENVIRONMENT_NAME` | `cloud-lib-prod` |
| `VITE_API_BASE_URL` | Your EB environment URL |

---

## Step 8 — Deploy!

Push to `main` to trigger the CI/CD pipeline:

```bash
git add .
git commit -m "feat: add AWS deployment configuration"
git push origin main
```

Watch the pipeline at: `https://github.com/<your-username>/<repo>/actions`

---

## Step 9 — Verify the Deployment

| Check | URL | Expected |
|---|---|---|
| Frontend | `https://<cloudfront-domain>` | Login page loads |
| API Health | `<EB-URL>/api/health` | `{"status":"OK","database":"connected"}` |
| Admin Login | Frontend → Login | `admin@cloudlib.com` / `admin123` |
| Student Login | Frontend → Login | `student@cloudlib.com` / `student123` |

---

## Local Docker Testing (Before Deploying)

Test the full stack locally using Docker before pushing:

```bash
# 1. Build the React frontend
cd frontend && npm run build && cd ..

# 2. Start everything with Docker Compose
docker compose up --build

# 3. Open http://localhost:8080 in your browser

# 4. Tear down
docker compose down -v
```

---

## Estimated Monthly Cost (Free Tier)

| Service | Free Tier | After Free Tier |
|---|---|---|
| RDS db.t3.micro | 750 hrs/month | ~$15/month |
| EB t3.small | 750 hrs/month | ~$15/month |
| S3 | 5 GB | ~$0.02/month |
| CloudFront | 1 TB transfer | ~$0.085/GB |
| SNS | 1M publishes | ~$0.50/M |
| **Total** | **~$0/month** | **~$30/month** |

---

## Troubleshooting

### EB Health check failing
```bash
# Check EB logs
aws elasticbeanstalk retrieve-environment-info \
  --environment-name cloud-lib-prod \
  --info-type tail
```

### RDS connection refused
- Ensure EB security group is allowed in RDS inbound rules
- Check `DB_HOST` env var matches RDS endpoint exactly

### CloudFront showing old version
```bash
aws cloudfront create-invalidation \
  --distribution-id <CF_ID> \
  --paths "/*"
```

### SNS notifications not arriving
- Check spam folder
- Confirm subscription was clicked in confirmation email
- Verify `SNS_TOPIC_ARN` is set correctly in EB env vars

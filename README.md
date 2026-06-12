# 📚 Cloud Lib — Library Management System

Cloud Lib is a modern, high-performance, and beautifully designed full-stack Library Management System. It is built with **React (Vite)** on the frontend and **Node.js (Express)** on the backend, backed by **MySQL** for data persistence. It supports advanced features such as priority-based book reservations, dynamic book cover image retrieval, theme-aware light/dark modes, and **automated AWS deployment pipelines**.

---

## ⚡ Tech Stack & Cloud Architecture

```
                       ┌────────────────────────┐
                       │   Client Web Browser   │
                       └───────────┬────────────┘
                                   │
                    ┌──────────────┴──────────────┐
             HTTPS  │                      HTTPS  │
                    ▼                             ▼
         ┌────────────────────┐        ┌────────────────────┐
         │   CloudFront CDN   │        │ Application Load   │
         └──────────┬─────────┘        │     Balancer       │
                    │                  └──────────┬─────────┘
                    ▼                             ▼
         ┌────────────────────┐        ┌────────────────────┐
         │     S3 Bucket      │        │ Elastic Beanstalk  │
         │ (React Static App) │        │ (Node.js 20 API)   │
         └────────────────────┘        └────┬──────────┬────┘
                                            │          │
                                            ▼          ▼
                                       ┌────────┐  ┌────────┐
                                       │ Amazon │  │ Amazon │
                                       │  RDS   │  │  SNS   │
                                       │(MySQL) │  │(Email) │
                                       └────────┘  └────────┘
```

* **Frontend**: React 19, Vite, Tailwind CSS, Axios, and Glassmorphism design aesthetics.
* **Backend**: Node.js, Express, JWT Authentication, and Connection-Pooled MySQL queries.
* **Database**: MySQL (Amazon RDS).
* **Alert System**: AWS Simple Notification Service (SNS) for automated email updates regarding overdue books.
* **CI/CD**: GitHub Actions for automated linting, building, and deploying.

---

## 🚀 Local Development Setup

You can run the application locally in one of two ways: using **Docker (recommended)** or running the servers **manually**.

### Option A — The Easy Way (Docker Compose)
Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

1. **Build and package the frontend**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
2. **Start the containers**
   ```bash
   docker compose up --build
   ```
3. **Open the App**
   Open your browser and navigate to `http://localhost:8080`.

---

### Option B — Manual Setup (Vite + Node.js)
You must have **Node.js v20+** and a running **MySQL database** server.

#### 1. Database Setup
1. Log into your local MySQL console and create a database named `cloud_lib`:
   ```sql
   CREATE DATABASE cloud_lib;
   ```
2. Run the schema file to initialize tables and insert seed users/books:
   ```bash
   mysql -u root -p cloud_lib < database/schema.sql
   ```

#### 2. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (copying from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Modify the `.env` variables (e.g. database credentials, JWT secret, ports).
4. Run the backend development server:
   ```bash
   npm run dev
   ```

#### 3. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. **Access the Application**:
   Open `http://localhost:5173`.
   * **Librarian (Admin)**: `admin@cloudlib.com` / `admin123`
   * **Library Member (Student)**: `student@cloudlib.com` / `student123`

---

## ☁️ AWS Deployment Guide (Step-by-Step)

This guide takes you through deploying Cloud Lib to Amazon Web Services (AWS) using industry standard services.

### Prerequisites
1. An active **AWS Account**.
2. **AWS CLI v2** installed and configured (run `aws configure` with your IAM programmatic access key).
3. **jq utility** installed (used by the setup script to parse AWS responses).

---

### Step 1 — Setup AWS Infrastructure Automatically
We have written a shell script `aws/setup.sh` that provisions the storage (S3), content delivery network (CloudFront), notifications (SNS), and deployment access permissions (IAM policies) automatically.

1. Set your alert email address:
   ```bash
   export ALERT_EMAIL="your-email@university.edu"
   ```
2. Run the setup script from the project root:
   ```bash
   # Linux/macOS
   chmod +x aws/setup.sh
   ./aws/setup.sh
   
   # Windows (Git Bash or WSL)
   ./aws/setup.sh
   ```
3. **Save the Output Values** printed at the end of the script execution. They will look like this:
   ```env
   AWS_REGION                 = ap-southeast-1
   S3_BUCKET_FRONTEND         = cloud-lib-frontend-1749123456
   S3_BUCKET_EB_DEPLOY        = cloud-lib-eb-deploy-1749123457
   CLOUDFRONT_DISTRIBUTION_ID = E123456789ABCD
   EB_APPLICATION_NAME        = cloud-lib
   EB_ENVIRONMENT_NAME        = cloud-lib-prod
   SNS_TOPIC_ARN              = arn:aws:sns:ap-southeast-1:123456789:CloudLibOverdueAlerts
   ```
4. **Confirm SNS Email Subscription**: Check the inbox of the email you provided in `ALERT_EMAIL`. Click **"Confirm Subscription"** in the message received from AWS SNS.

---

### Step 2 — Create the RDS MySQL Database
We will create a managed MySQL database in the AWS cloud using Amazon RDS.

1. Open the **AWS Console** and search for **RDS**. Click **Create database**.
2. Select **Standard create** and choose **MySQL**.
3. Under **Templates**, select **Free Tier** (to avoid charges) or **Dev/Test**.
4. Set DB instance identifier to `cloud-lib-db`.
5. Set Master username to `admin` and choose a strong password (save this password!).
6. Under **Connectivity**:
   * **Virtual Private Cloud (VPC)**: Choose your **Default VPC**.
   * **Public access**: Select **No** (the database is kept private inside the network; only the backend server can talk to it).
7. Scroll to the bottom and click **Create database**.
8. Wait for status to become `Available`, then click on the database name and copy the **Endpoint** (looks like `cloud-lib-db.xxxxxx.ap-southeast-1.rds.amazonaws.com`).

#### Run Schema on RDS
To load seed tables into the new cloud database, connect temporarily from your local machine:
1. Temporarily allow your public IP address under the RDS Security Group inbound rules for port `3306`.
2. Execute the schema file:
   ```bash
   mysql -h <YOUR_RDS_ENDPOINT> -u admin -p cloud_lib < database/schema.sql
   ```
3. Delete or modify the security group rule to remove your IP when done.

---

### Step 3 — Create Elastic Beanstalk Environment for Backend API
We will deploy the Node.js API to Elastic Beanstalk, which provisions and handles servers, load balancing, and auto-scaling.

1. Search for **Elastic Beanstalk** in the AWS Console, click **Create Application**.
2. Configure Environment:
   * **Platform**: Choose **Node.js**.
   * **Platform branch**: Choose **Node.js 20 running on 64bit Amazon Linux 2023**.
   * **Application code**: Select **Sample application** (our CI/CD pipeline will push our actual code in the next step).
   * **Presets**: Choose **Single instance** (free tier eligible) or **High availability**.
3. Under **Configure service access**, ensure you assign an EC2 Instance Profile (often called `aws-elasticbeanstalk-ec2-role`).
4. Under **Configuration → Software → Environment properties**, add the database and cloud credentials:
   
   | Property Name | Value |
   |---|---|
   | `PORT` | `5000` |
   | `NODE_ENV` | `production` |
   | `DB_HOST` | *(Paste your RDS endpoint)* |
   | `DB_PORT` | `3306` |
   | `DB_NAME` | `cloud_lib` |
   | `DB_USER` | `admin` |
   | `DB_PASSWORD` | *(Your RDS password)* |
   | `JWT_SECRET` | *(Create a long random string)* |
   | `FRONTEND_URL` | `https://your-cloudfront-domain.cloudfront.net` |
   | `AWS_REGION` | `ap-southeast-1` |
   | `SNS_TOPIC_ARN` | *(Paste the SNS_TOPIC_ARN from Step 1)* |

5. Create the environment. Once ready, copy the generated **Elastic Beanstalk Environment URL** (looks like `cloud-lib-prod.xxxxxx.ap-southeast-1.elasticbeanstalk.com`).

---

### Step 4 — Authorize Connection Between Backend and Database
Since our database does not allow public traffic, we must tell AWS to let our backend server connect to RDS.

1. Go to **EC2 → Instances**, find your running Elastic Beanstalk backend instance, and look up its **Security Group ID**.
2. Go to **RDS → Databases → cloud-lib-db**, click on its active **VPC Security Group**.
3. Edit **Inbound Rules** and add a rule:
   * **Type**: `MySQL/Aurora` (Port 3306)
   * **Source**: Select/paste the **Security Group ID** of the Elastic Beanstalk backend instance.
   * Save rules.

---

### Step 5 — Configure GitHub Actions CI/CD Pipeline
Every time you push code changes to GitHub, it will automatically build your React app, package your Express API, and deploy both to AWS.

1. In your GitHub repository, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add the following keys using the values saved from Step 1:
   * `AWS_ACCESS_KEY_ID`: Your AWS IAM User Access Key
   * `AWS_SECRET_ACCESS_KEY`: Your AWS IAM User Secret Key
   * `AWS_REGION`: `ap-southeast-1` (or your preferred region)
   * `S3_BUCKET_FRONTEND`: Saved `S3_FRONTEND` value
   * `S3_BUCKET_EB_DEPLOY`: Saved `S3_EB_DEPLOY` value
   * `CLOUDFRONT_DISTRIBUTION_ID`: Saved `CF_ID` value
   * `EB_APPLICATION_NAME`: `cloud-lib`
   * `EB_ENVIRONMENT_NAME`: `cloud-lib-prod`
   * `VITE_API_BASE_URL`: *(Paste your Elastic Beanstalk URL from Step 3)*

---

### Step 6 — Deploy!
Push your local code to your remote GitHub repository:
```bash
git add .
git commit -m "deploy: configure production environment"
git push origin main
```
Go to the **Actions** tab in your GitHub repository. You will see the pipeline building, testing, compiling assets, and deploying to S3/CloudFront and Elastic Beanstalk. Once it turns green, your app is fully live!

---

## 🛠️ Troubleshooting
* **Blank screen on frontend**: The React static files are cached by CloudFront. Run a CloudFront cache invalidation if changes do not appear immediately:
  ```bash
  aws cloudfront create-invalidation --distribution-id <CF_DISTRIBUTION_ID> --paths "/*"
  ```
* **Database Connection Timed Out**: Double check your RDS inbound security rules. The backend security group must be whitelisted on port `3306` inside the RDS security group.
* **Elastic Beanstalk Health Warning**: Go to the Elastic Beanstalk console, click **Logs → Request logs → Tail**, and inspect the logs to check if Node failed to start due to missing environment properties.

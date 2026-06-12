#!/usr/bin/env bash
# ============================================================
# Cloud Lib — AWS Infrastructure Setup Script (One-Time)
# Run this ONCE to provision all AWS resources before the
# first CI/CD pipeline run.
#
# Prerequisites:
#   - AWS CLI installed: https://aws.amazon.com/cli/
#   - Configured: aws configure
#   - jq installed: https://jqlang.github.io/jq/
#
# Usage:
#   chmod +x aws/setup.sh
#   ./aws/setup.sh
# ============================================================

set -euo pipefail

# ── Configuration — edit these values ─────────────────────────
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
APP_NAME="cloud-lib"
ENV_NAME="cloud-lib-prod"
S3_FRONTEND="cloud-lib-frontend-$(date +%s)"   # must be globally unique
S3_EB_DEPLOY="cloud-lib-eb-deploy-$(date +%s)" # must be globally unique
SNS_TOPIC_NAME="CloudLibOverdueAlerts"
ALERT_EMAIL="${ALERT_EMAIL:-your-email@example.com}"  # change this!

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================================"
echo -e " Cloud Lib — AWS Infrastructure Setup"
echo -e "============================================================${NC}"
echo ""

# ── 1. S3 Bucket: Frontend ─────────────────────────────────────
echo -e "${YELLOW}[1/7] Creating S3 bucket for React frontend...${NC}"
aws s3api create-bucket \
  --bucket "$S3_FRONTEND" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"

# Disable public access block to allow CloudFront OAC
aws s3api put-public-access-block \
  --bucket "$S3_FRONTEND" \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo -e "${GREEN}✅ Frontend S3 bucket: $S3_FRONTEND${NC}"

# ── 2. S3 Bucket: Elastic Beanstalk Deployments ───────────────
echo -e "${YELLOW}[2/7] Creating S3 bucket for EB deployment packages...${NC}"
aws s3api create-bucket \
  --bucket "$S3_EB_DEPLOY" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"

echo -e "${GREEN}✅ EB deploy S3 bucket: $S3_EB_DEPLOY${NC}"

# ── 3. CloudFront Distribution ─────────────────────────────────
echo -e "${YELLOW}[3/7] Creating CloudFront distribution...${NC}"
CF_RESPONSE=$(aws cloudfront create-distribution \
  --distribution-config "{
    \"CallerReference\": \"cloud-lib-$(date +%s)\",
    \"Comment\": \"Cloud Lib Frontend CDN\",
    \"DefaultCacheBehavior\": {
      \"TargetOriginId\": \"S3-${S3_FRONTEND}\",
      \"ViewerProtocolPolicy\": \"redirect-to-https\",
      \"AllowedMethods\": { \"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"] },
      \"CachedMethods\":  { \"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"] },
      \"Compress\": true,
      \"ForwardedValues\": {
        \"QueryString\": false,
        \"Cookies\": { \"Forward\": \"none\" }
      },
      \"MinTTL\": 0,
      \"DefaultTTL\": 86400,
      \"MaxTTL\": 31536000
    },
    \"Origins\": {
      \"Quantity\": 1,
      \"Items\": [{
        \"Id\": \"S3-${S3_FRONTEND}\",
        \"DomainName\": \"${S3_FRONTEND}.s3.${AWS_REGION}.amazonaws.com\",
        \"S3OriginConfig\": { \"OriginAccessIdentity\": \"\" }
      }]
    },
    \"CustomErrorResponses\": {
      \"Quantity\": 1,
      \"Items\": [{
        \"ErrorCode\": 403,
        \"ResponsePagePath\": \"/index.html\",
        \"ResponseCode\": \"200\",
        \"ErrorCachingMinTTL\": 300
      }]
    },
    \"DefaultRootObject\": \"index.html\",
    \"Enabled\": true,
    \"PriceClass\": \"PriceClass_100\"
  }")

CF_DOMAIN=$(echo "$CF_RESPONSE" | jq -r '.Distribution.DomainName')
CF_ID=$(echo "$CF_RESPONSE" | jq -r '.Distribution.Id')
echo -e "${GREEN}✅ CloudFront distribution: https://$CF_DOMAIN${NC}"
echo -e "${GREEN}   Distribution ID: $CF_ID${NC}"

# ── 4. Elastic Beanstalk Application ──────────────────────────
echo -e "${YELLOW}[4/7] Creating Elastic Beanstalk application...${NC}"
aws elasticbeanstalk create-application \
  --application-name "$APP_NAME" \
  --description "Cloud Lib Library Management System API" \
  --region "$AWS_REGION" 2>/dev/null || echo "   (Application already exists)"

echo -e "${GREEN}✅ EB Application: $APP_NAME${NC}"

# ── 5. SNS Topic: Overdue Alerts ──────────────────────────────
echo -e "${YELLOW}[5/7] Creating SNS topic for overdue alerts...${NC}"
SNS_ARN=$(aws sns create-topic \
  --name "$SNS_TOPIC_NAME" \
  --region "$AWS_REGION" \
  --query 'TopicArn' \
  --output text)

# Subscribe your email to receive alerts
aws sns subscribe \
  --topic-arn "$SNS_ARN" \
  --protocol email \
  --notification-endpoint "$ALERT_EMAIL" \
  --region "$AWS_REGION"

echo -e "${GREEN}✅ SNS Topic ARN: $SNS_ARN${NC}"
echo -e "${YELLOW}   ⚠️  Check $ALERT_EMAIL and confirm the subscription!${NC}"

# ── 6. IAM Policy for GitHub Actions ──────────────────────────
echo -e "${YELLOW}[6/7] Creating IAM policy for CI/CD (GitHub Actions)...${NC}"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject","s3:ListBucket","s3:PutObjectAcl"],
      "Resource": [
        "arn:aws:s3:::${S3_FRONTEND}",
        "arn:aws:s3:::${S3_FRONTEND}/*",
        "arn:aws:s3:::${S3_EB_DEPLOY}",
        "arn:aws:s3:::${S3_EB_DEPLOY}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::*:distribution/${CF_ID}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticbeanstalk:CreateApplicationVersion",
        "elasticbeanstalk:UpdateEnvironment",
        "elasticbeanstalk:DescribeEnvironments"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "${SNS_ARN}"
    }
  ]
}
EOF
)

aws iam create-policy \
  --policy-name "CloudLibCICDPolicy" \
  --policy-document "$POLICY_DOC" \
  --description "Least-privilege policy for Cloud Lib GitHub Actions CI/CD" 2>/dev/null \
  || echo "   (Policy already exists, skipping)"

echo -e "${GREEN}✅ IAM policy created: CloudLibCICDPolicy${NC}"

# ── 7. Print Summary ───────────────────────────────────────────
echo ""
echo -e "${CYAN}============================================================"
echo -e " Setup Complete! Copy these values to GitHub Secrets:"
echo -e "============================================================${NC}"
echo ""
echo "  AWS_REGION                = $AWS_REGION"
echo "  S3_BUCKET_FRONTEND        = $S3_FRONTEND"
echo "  S3_BUCKET_EB_DEPLOY       = $S3_EB_DEPLOY"
echo "  CLOUDFRONT_DISTRIBUTION_ID = $CF_ID"
echo "  EB_APPLICATION_NAME       = $APP_NAME"
echo "  EB_ENVIRONMENT_NAME       = $ENV_NAME"
echo "  SNS_TOPIC_ARN             = $SNS_ARN"
echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS:"
echo "  1. Create RDS MySQL instance (see aws/README.md Step 4)"
echo "  2. Create EB environment with RDS credentials in env vars"
echo "  3. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to GitHub Secrets"
echo -e "  4. Confirm SNS subscription email sent to $ALERT_EMAIL${NC}"
echo ""

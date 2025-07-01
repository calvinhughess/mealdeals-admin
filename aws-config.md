# AWS Configuration Guide

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

## Getting AWS Credentials

1. Go to AWS IAM Console
2. Create a new user or use an existing one
3. Attach the following policies:
   - `AmazonDynamoDBFullAccess` (for development)
   - Or create a custom policy with specific permissions for the DealsList table

## DynamoDB Table Setup

### Option 1: AWS Console (Quick Setup)
1. Go to DynamoDB Console
2. Click "Create table"
3. Table name: `DealsList`
4. Partition key: `dealId` (String)
5. Sort key: `createdAt` (String) - Optional
6. Capacity mode: On-demand
7. Click "Create"

### Option 2: AWS CLI
```bash
aws dynamodb create-table \
  --table-name DealsList \
  --attribute-definitions AttributeName=dealId,AttributeType=S \
  --key-schema AttributeName=dealId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Option 3: Infrastructure as Code (CDK)
See the CDK example in the main documentation. 
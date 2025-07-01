# DynamoDB Integration Setup

This guide will help you set up DynamoDB integration for your Deals Admin Dashboard.

## 🚀 Quick Start

### 1. Set Up AWS Credentials

Create a `.env.local` file in your project root:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### 2. Create DynamoDB Table

#### Option A: AWS Console (Recommended for quick start)
1. Go to [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click "Create table"
3. Table name: `DealsList`
4. Partition key: `dealId` (String)
5. Sort key: `createdAt` (String) - Optional but recommended
6. Capacity mode: **On-demand** (pay per request)
7. Click "Create"

#### Option B: AWS CLI
```bash
aws dynamodb create-table \
  --table-name DealsList \
  --attribute-definitions \
    AttributeName=dealId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=dealId,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

#### Option C: CDK (Infrastructure as Code)
```bash
cd infrastructure
npm install
npm run build
cdk deploy
```

### 3. Set Up IAM Permissions

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/DealsList"
    }
  ]
}
```

### 4. Run Your Application

```bash
npm run dev
```

Your dashboard will now connect to DynamoDB at `/api/dealslist` endpoints.

## 📁 Project Structure

```
src/app/
├── api/
│   └── dealslist/
│       ├── route.ts              # GET /api/dealslist, POST /api/dealslist
│       └── [id]/
│           └── route.ts          # GET /api/dealslist/[id], PATCH, DELETE
├── layout.tsx                    # Updated dashboard component
└── page.tsx

infrastructure/
├── bin/
│   └── app.ts                    # CDK app entry point
├── dealslist-stack.ts            # DynamoDB table definition
├── package.json                  # CDK dependencies
└── cdk.json                      # CDK configuration
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dealslist` | List all deals |
| POST | `/api/dealslist` | Create a new deal |
| GET | `/api/dealslist/[id]` | Get a specific deal |
| PATCH | `/api/dealslist/[id]` | Update a deal |
| DELETE | `/api/dealslist/[id]` | Delete a deal |

## 📊 Data Model

```typescript
interface Deal {
  dealId: string;        // Partition key (auto-generated if not provided)
  chainId: string;       // Restaurant chain identifier (e.g., "popeyes", "mcdonalds")
  title: string;         // Deal title
  description: string;   // Full description of the offer/terms
  dealType: 'IN_APP' | 'IN_STORE' | 'COUPON_CODE' | 'SIGNUP_BONUS' | 'WEAR_PROMO' | 'PUNCH_CARD';
  params?: {             // Deal-type-specific details
    couponCode?: string;
    minPurchaseCents?: number;
    freeItemId?: string;
    promoWearColor?: string;
    bonusPoints?: number;
    [key: string]: any;
  };
  startDate: string;     // Start date (ISO string)
  endDate?: string;      // End date (ISO string, optional)
  locationScope: 'GLOBAL' | 'REGIONAL' | 'STORE_SPECIFIC';
  regions?: string[];    // If REGIONAL: list of state codes or ZIP prefixes
  storeIds?: string[];   // If STORE_SPECIFIC: list of store location IDs
  geoHash?: string;      // Optional geohash for location-based queries
  active: boolean;       // Whether the deal should currently be shown
  createdAt: string;     // Sort key (auto-generated)
  updatedAt: string;     // Last modification timestamp
  ttl?: number;          // DynamoDB TTL for auto-expiry
}
```

### Deal Types
- **IN_APP**: In-app promotions and offers
- **IN_STORE**: Physical store promotions
- **COUPON_CODE**: Coupon code offers
- **SIGNUP_BONUS**: New user signup bonuses
- **WEAR_PROMO**: Wearable/promotional item offers
- **PUNCH_CARD**: Loyalty program punch cards

### Location Scopes
- **GLOBAL**: Available everywhere
- **REGIONAL**: Available in specific regions (use `regions` field)
- **STORE_SPECIFIC**: Available at specific stores (use `storeIds` field)

## 🛠️ Development

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Infrastructure Deployment (CDK)
```bash
cd infrastructure
npm install
npm run build
cdk deploy
```

## 🔍 Troubleshooting

### Common Issues

1. **"Access Denied" errors**: Check your AWS credentials and IAM permissions
2. **"Table not found"**: Ensure the DynamoDB table exists and is named `DealsList`
3. **"Region not found"**: Verify your `AWS_REGION` environment variable

### Debug Mode

Add this to your `.env.local` for detailed logging:
```bash
DEBUG=aws-sdk:*
```

## 📈 Scaling Considerations

- **On-demand billing**: Automatically scales with usage
- **No capacity planning**: Perfect for development and variable workloads
- **Cost optimization**: Consider switching to provisioned capacity for predictable workloads

## 🔒 Security Best Practices

1. Use IAM roles instead of access keys when possible
2. Implement least-privilege access
3. Enable DynamoDB encryption at rest
4. Use VPC endpoints for enhanced security
5. Monitor access with CloudTrail

## 📚 Additional Resources

- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [AWS SDK v3 Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) 
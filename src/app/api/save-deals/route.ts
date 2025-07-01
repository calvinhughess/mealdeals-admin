import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'DealsList';

type Deal = {
  expiryDate: string;
  company: string;
  description: string;
  redemptionMethod: string;
  discountAmount: string;
  additionalInfo: string;
  category: 'reward' | 'universal';
};

/**
 * Convert EmailLambda deal format to DealsList table format
 */
function convertDealFormat(deal: Deal) {
  const now = new Date().toISOString();
  const dealId = `${deal.company.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Parse expiry date if it exists
  let endDate = '';
  if (deal.expiryDate) {
    try {
      const expiryDate = new Date(deal.expiryDate);
      if (!isNaN(expiryDate.getTime())) {
        endDate = expiryDate.toISOString();
      }
    } catch (error) {
      console.warn('Invalid expiry date:', deal.expiryDate);
    }
  }

  return {
    dealId,
    chainId: deal.company.toLowerCase().replace(/\s+/g, '-'),
    title: `${deal.company} - ${deal.description}`,
    description: deal.description,
    dealType: deal.category,
    params: {
      discountAmount: deal.discountAmount,
      redemptionMethod: deal.redemptionMethod,
      additionalInfo: deal.additionalInfo,
    },
    startDate: now,
    endDate,
    locationScope: 'national', // Default to national
    regions: [],
    storeIds: [],
    geoHash: '',
    active: true,
    createdAt: now,
    updatedAt: now,
    ttl: endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined,
  };
}

/**
 * Check if deal already exists to avoid duplicates
 */
async function dealExists(deal: Deal): Promise<boolean> {
  try {
    const companyKey = deal.company.toLowerCase().replace(/\s+/g, '-');
    const descriptionKey = deal.description.toLowerCase().trim();
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'chainId-startDate-index',
      KeyConditionExpression: 'chainId = :chainId',
      FilterExpression: 'contains(description, :description)',
      ExpressionAttributeValues: {
        ':chainId': companyKey,
        ':description': descriptionKey,
      },
      Limit: 1,
    });

    const result = await docClient.send(command);
    return (result.Items?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking if deal exists:', error);
    return false; // Assume it doesn't exist if we can't check
  }
}

/**
 * POST /api/save-deals
 * Body: { deals: Deal[] }
 * Returns: { message: string, savedCount: number, skippedCount: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { deals } = await request.json() as { deals: Deal[] };
    
    if (!Array.isArray(deals)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    console.log(`Processing ${deals.length} deals for saving...`);

    let savedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const deal of deals) {
      try {
        // Check if deal already exists
        const exists = await dealExists(deal);
        if (exists) {
          console.log(`Skipping duplicate deal: ${deal.company} - ${deal.description}`);
          skippedCount++;
          continue;
        }

        // Convert to DealsList format
        const dealItem = convertDealFormat(deal);

        // Save to DynamoDB
        const command = new PutCommand({
          TableName: TABLE_NAME,
          Item: dealItem,
        });

        await docClient.send(command);
        console.log(`Saved deal: ${dealItem.title}`);
        savedCount++;

      } catch (error: any) {
        console.error(`Error saving deal ${deal.company}:`, error);
        errors.push(`${deal.company}: ${error.message}`);
      }
    }

    const result = {
      message: `Successfully processed ${deals.length} deals`,
      savedCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Save deals result:', result);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('save-deals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save deals' },
      { status: 500 }
    );
  }
} 
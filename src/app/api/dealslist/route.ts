import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET() {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'DealsList' }));
    return NextResponse.json(data.Items || []);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    
    // Calculate TTL if endDate is provided (30 days after end date)
    let ttl: number | undefined;
    if (body.endDate) {
      const endDate = new Date(body.endDate);
      const ttlDate = new Date(endDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after end
      ttl = Math.floor(ttlDate.getTime() / 1000);
    }
    
    const item = { 
      ...body, 
      dealId: body.dealId || crypto.randomUUID(), 
      createdAt: now,
      updatedAt: now,
      ttl
    };
    
    await docClient.send(new PutCommand({ 
      TableName: 'DealsList', 
      Item: item 
    }));
    
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
} 
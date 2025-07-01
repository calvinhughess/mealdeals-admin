import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await docClient.send(new GetCommand({ 
      TableName: 'DealsList', 
      Key: { dealId: params.id } 
    }));
    
    if (!result.Item) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    
    return NextResponse.json(result.Item);
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Calculate TTL if endDate is being updated
    let ttl: number | undefined;
    if (body.endDate) {
      const endDate = new Date(body.endDate);
      const ttlDate = new Date(endDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after end
      ttl = Math.floor(ttlDate.getTime() / 1000);
    }
    
    // Build UpdateExpression and ExpressionAttributeNames/Values
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Add updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    // Add TTL if calculated
    if (ttl !== undefined) {
      updateExpressions.push('#ttl = :ttl');
      expressionAttributeNames['#ttl'] = 'ttl';
      expressionAttributeValues[':ttl'] = ttl;
    }
    
    Object.entries(body).forEach(([key, value], index) => {
      const nameKey = `#k${index}`;
      const valueKey = `:v${index}`;
      
      updateExpressions.push(`${nameKey} = ${valueKey}`);
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
    });
    
    const cmd = new UpdateCommand({
      TableName: 'DealsList',
      Key: { dealId: params.id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    const updated = await docClient.send(cmd);
    return NextResponse.json(updated.Attributes);
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await docClient.send(new DeleteCommand({ 
      TableName: 'DealsList', 
      Key: { dealId: params.id } 
    }));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
} 
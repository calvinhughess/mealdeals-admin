import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode, RemovalPolicy } from 'aws-cdk-lib/aws-dynamodb';

export class DealsListStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the DynamoDB table
    const dealsTable = new Table(this, 'DealsListTable', {
      tableName: 'DealsList',
      partitionKey: { name: 'dealId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN, // Keep table when stack is destroyed
      pointInTimeRecovery: true, // Enable point-in-time recovery
      timeToLiveAttribute: 'ttl', // Enable TTL for auto-expiry
    });

    // Add GSIs for common query patterns
    dealsTable.addGlobalSecondaryIndex({
      indexName: 'ChainIdIndex',
      partitionKey: { name: 'chainId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
    });

    dealsTable.addGlobalSecondaryIndex({
      indexName: 'ActiveIndex',
      partitionKey: { name: 'active', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
    });

    dealsTable.addGlobalSecondaryIndex({
      indexName: 'DealTypeIndex',
      partitionKey: { name: 'dealType', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
    });

    // Output the table name for reference
    new cdk.CfnOutput(this, 'DealsListTableName', {
      value: dealsTable.tableName,
      description: 'Name of the DealsList DynamoDB table',
    });

    // Output the table ARN for IAM policies
    new cdk.CfnOutput(this, 'DealsListTableArn', {
      value: dealsTable.tableArn,
      description: 'ARN of the DealsList DynamoDB table',
    });
  }
} 
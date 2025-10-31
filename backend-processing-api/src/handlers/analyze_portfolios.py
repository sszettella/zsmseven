"""
AWS Lambda function to collect all portfolio IDs and queue them for analysis.

Scans the user-portfolios table and sends each active portfolio ID to SQS
for processing by the analyze_portfolio lambda.

Required environment variables:
- PORTFOLIOS_TABLE (DynamoDB table name for portfolios)
- ANALYSIS_QUEUE_URL (SQS queue URL for portfolio analysis)
"""

import boto3
import json
import os

# Environment variables
PORTFOLIOS_TABLE = os.environ.get('PORTFOLIOS_TABLE')
ANALYSIS_QUEUE_URL = os.environ.get('ANALYSIS_QUEUE_URL')

# AWS clients
dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')
portfolios_table = dynamodb.Table(PORTFOLIOS_TABLE)

def lambda_handler(event, context):
    """
    AWS Lambda handler function.

    Scans all portfolios and queues them for analysis.

    Args:
        event (dict): Lambda event (not used)
        context: Lambda context

    Returns:
        dict: Status with count of portfolios queued
    """
    print("Starting portfolio collection for analysis")

    portfolios_queued = 0
    portfolios_skipped = 0

    # Scan all portfolios
    response = portfolios_table.scan()
    portfolios = response.get('Items', [])

    # Handle pagination if there are more items
    while 'LastEvaluatedKey' in response:
        response = portfolios_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        portfolios.extend(response.get('Items', []))

    print(f"Found {len(portfolios)} total portfolios")

    # Send each portfolio to SQS
    for portfolio in portfolios:
        portfolio_id = portfolio.get('id')
        portfolio_name = portfolio.get('name', 'Unknown')
        is_active = portfolio.get('isActive', True)

        if not portfolio_id:
            print(f"Skipping portfolio with no ID: {portfolio}")
            portfolios_skipped += 1
            continue

        # Only process active portfolios
        if not is_active:
            print(f"Skipping inactive portfolio: {portfolio_name} ({portfolio_id})")
            portfolios_skipped += 1
            continue

        try:
            message = {
                'portfolio_id': portfolio_id
            }

            sqs.send_message(
                QueueUrl=ANALYSIS_QUEUE_URL,
                MessageBody=json.dumps(message)
            )

            print(f"Queued portfolio: {portfolio_name} ({portfolio_id})")
            portfolios_queued += 1

        except Exception as e:
            print(f"ERROR queuing portfolio {portfolio_id}: {e}")
            portfolios_skipped += 1

    print(f"Portfolio collection complete. Queued: {portfolios_queued}, Skipped: {portfolios_skipped}")

    return {
        'status': 'success',
        'portfolios_queued': portfolios_queued,
        'portfolios_skipped': portfolios_skipped,
        'total_portfolios': len(portfolios)
    }

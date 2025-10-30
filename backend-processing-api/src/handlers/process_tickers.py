"""
AWS Lambda function to process tickers from portfolio-positions DynamoDB table
and send messages to SQS delay queue.

Scans the positions table for ticker symbols, creates messages with each ticker,
and sends them to an SQS queue with a 2-minute delay.

Required environment variables:
- POSITIONS_TABLE (DynamoDB table name for portfolio positions)
- SQS_QUEUE_URL (SQS queue URL for delayed processing)
"""

import boto3
import json
import os

# Environment variables
POSITIONS_TABLE = os.environ.get('POSITIONS_TABLE')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')

# DynamoDB and SQS clients
dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')
positions_table = dynamodb.Table(POSITIONS_TABLE)

def lambda_handler(event, context):
    """
    AWS Lambda handler function.

    Scans portfolio-positions table for tickers and sends delayed SQS messages.

    Args:
        event (dict): Event data (not used)
        context: Lambda context (not used)

    Returns:
        dict: Success message with count of messages sent
    """
    print("=" * 80)
    print("Starting portfolio ticker processing")
    print(f"DEBUG: Reading from table: {POSITIONS_TABLE}")
    print(f"DEBUG: Sending to SQS queue: {SQS_QUEUE_URL}")
    print("=" * 80)

    # Scan positions table for all items
    response = positions_table.scan()
    items = response['Items']

    # Handle pagination if needed
    while 'LastEvaluatedKey' in response:
        response = positions_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])

    print(f"Found {len(items)} position items")

    # Collect unique tickers with their position IDs
    ticker_positions = {}  # {ticker: [position_ids]}
    for item in items:
        if 'ticker' in item:
            ticker = item['ticker']
            position_id = item.get('id', 'unknown')
            if ticker not in ticker_positions:
                ticker_positions[ticker] = []
            ticker_positions[ticker].append(position_id)

    unique_tickers = list(ticker_positions.keys())
    print(f"Found {len(unique_tickers)} unique tickers: {unique_tickers}")

    for ticker, position_ids in ticker_positions.items():
        print(f"  {ticker}: {len(position_ids)} position(s) - {position_ids}")

    messages_sent = 0

    # Send message for each unique ticker
    for ticker in unique_tickers:
        print(f"Processing ticker: {ticker}")

        # Create message with position IDs for later update
        message = {
            'ticker': ticker,
            'source': 'portfolio_processor',
            'position_ids': ticker_positions[ticker]
        }

        # Send to SQS with staggered delay for rate limiting
        try:
            delay_seconds = messages_sent * 75  # staggered 1 minute 15s for rate limit with polygon.io
            sqs.send_message(
                QueueUrl=SQS_QUEUE_URL,
                MessageBody=json.dumps(message),
                DelaySeconds=delay_seconds
            )
            messages_sent += 1
            print(f"  ✓ Sent message for {ticker} to SQS (delay: {delay_seconds}s)")
        except Exception as e:
            print(f"  ✗ ERROR sending message for {ticker}: {e}")

    print("=" * 80)
    print(f"Completed processing: sent {messages_sent} messages to SQS queue")
    print("=" * 80)
    return {'status': 'success', 'messages_sent': messages_sent, 'unique_tickers': len(unique_tickers)}
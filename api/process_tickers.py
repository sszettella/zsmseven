"""
AWS Lambda function to process tickers from portfolios DynamoDB table
and send messages to SQS delay queue.

Scans the portfolios table for ticker symbols, creates messages with each ticker,
and sends them to an SQS queue with a 2-minute delay.

Required environment variables:
- PORTFOLIOS_TABLE (DynamoDB table name for portfolios)
- SQS_QUEUE_URL (SQS queue URL for delayed processing)
"""

import boto3
import json
import os

# Environment variables
PORTFOLIOS_TABLE = os.environ.get('PORTFOLIOS_TABLE')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')

# DynamoDB and SQS clients
dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')
portfolios_table = dynamodb.Table(PORTFOLIOS_TABLE)

def lambda_handler(event, context):
    """
    AWS Lambda handler function.

    Scans portfolios table for tickers and sends delayed SQS messages.

    Args:
        event (dict): Event data (not used)
        context: Lambda context (not used)

    Returns:
        dict: Success message with count of messages sent
    """
    print("Starting portfolio ticker processing")

    # Scan portfolios table for all items
    response = portfolios_table.scan()
    items = response['Items']

    # Handle pagination if needed
    while 'LastEvaluatedKey' in response:
        response = portfolios_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])

    print(f"Found {len(items)} portfolio items")

    # Collect unique tickers
    unique_tickers = set()
    for item in items:
        tickers = []
        if 'ticker' in item:
            tickers = [item['ticker']]
        elif 'tickers' in item:
            tickers = item['tickers']
            if isinstance(tickers, list):
                pass  # already list
            else:
                tickers = [tickers]  # in case it's single

        for ticker in tickers:
            unique_tickers.add(ticker)

    print(f"Found {len(unique_tickers)} unique tickers: {list(unique_tickers)}")

    messages_sent = 0

    # Send message for each unique ticker
    for ticker in unique_tickers:
        print(f"Processing ticker: {ticker}")

        # Create message
        message = {
            'ticker': ticker,
            'source': 'portfolio_processor'
        }

        # Send to SQS with ~ 1-minute delay
        try:
            sqs.send_message(
                QueueUrl=SQS_QUEUE_URL,
                MessageBody=json.dumps(message),
                DelaySeconds=(messages_sent*75)  # staggered 1 minute 15s for rate limit with polygon.io
            )
            messages_sent += 1
            print(f"Sent message for {ticker}")
        except Exception as e:
            print(f"ERROR sending message for {ticker}: {e}")

    print(f"Completed processing, sent {messages_sent} messages")
    return {'status': 'success', 'messages_sent': messages_sent}
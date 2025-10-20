"""
AWS Lambda function to analyze portfolios by fetching ticker data
and sending analysis requests to Xai API.

Scans portfolios table, retrieves latest ticker data from ticker-data table,
packages the information, and sends to Xai API for analysis.

Required environment variables:
- PORTFOLIOS_TABLE (DynamoDB table name for portfolios)
- TICKER_DATA_TABLE (DynamoDB table name for ticker data)
- XAI_API_URL (Xai API endpoint URL)
- XAI_API_KEY (Xai API key)
"""

import boto3
import json
import os
from datetime import datetime

# Environment variables
PORTFOLIOS_TABLE = os.environ.get('PORTFOLIOS_TABLE')
TICKER_DATA_TABLE = os.environ.get('TICKER_DATA_TABLE')
ANALYSIS_LAMBDA = os.environ.get('ANALYSIS_LAMBDA', 'zsmseven-tracker-api-dev-processPortfolioAnalysis')

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
portfolios_table = dynamodb.Table(PORTFOLIOS_TABLE)
ticker_table = dynamodb.Table(TICKER_DATA_TABLE)

# Lambda client
lambda_client = boto3.client('lambda')

def decimal_to_float(obj):
    """
    Convert Decimal objects to float for JSON serialization.
    """
    if isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    elif hasattr(obj, '__float__'):  # Decimal
        return float(obj)
    else:
        return obj

def get_latest_ticker_data(ticker):
    """
    Get the latest data for a ticker from ticker-data table.

    Args:
        ticker (str): The ticker symbol

    Returns:
        dict or None: Latest ticker data
    """
    response = ticker_table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('ticker').eq(ticker),
        ScanIndexForward=False,  # Most recent first
        Limit=1
    )
    items = response['Items']
    return items[0] if items else None

def lambda_handler(event, context):
    """
    AWS Lambda handler function.

    Analyzes a specific portfolio and sends to Xai API.

    Args:
        event (dict): Event with portfolio_name
        context: Lambda context

    Returns:
        dict: Success message
    """
    portfolio_name = event.get('portfolio_name')
    if not portfolio_name:
        return {'status': 'error', 'message': 'portfolio_name required'}

    print(f"Starting analysis for portfolio: {portfolio_name}")

    # Get portfolio from table
    response = portfolios_table.get_item(Key={'portfolio_name': portfolio_name})
    portfolio = response.get('Item')
    if not portfolio:
        return {'status': 'error', 'message': f'Portfolio {portfolio_name} not found'}

    tickers = portfolio.get('tickers', [])

    print(f"Analyzing portfolio: {portfolio_name} with {len(tickers)} tickers")

    # Collect ticker data
    ticker_data = {}
    for ticker in tickers:
        data = get_latest_ticker_data(ticker)
        if data:
            ticker_data[ticker] = data
        else:
            print(f"No data found for {ticker}")

    if not ticker_data:
        print(f"No ticker data for portfolio {portfolio_name}")
        return {'status': 'error', 'message': 'No ticker data available'}

    # Invoke analysis Lambda asynchronously
    try:
        payload = {
            'portfolio_name': portfolio_name,
            'ticker_data': decimal_to_float(ticker_data)
        }
        print(f"Invoking {ANALYSIS_LAMBDA} with payload: {json.dumps(payload)}")
        response = lambda_client.invoke(
            FunctionName=ANALYSIS_LAMBDA,
            InvocationType='Event',  # Asynchronous
            Payload=json.dumps(payload)
        )
        print(f"Analysis Lambda invoke response: {response}")
        print(f"Analysis Lambda invoked for {portfolio_name}")
        return {'status': 'success', 'portfolio': portfolio_name}
    except Exception as e:
        print(f"ERROR invoking analysis Lambda for {portfolio_name}: {e}")
        return {'status': 'error', 'message': str(e)}
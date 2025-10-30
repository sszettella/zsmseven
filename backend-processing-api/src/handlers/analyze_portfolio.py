"""
AWS Lambda function to analyze portfolios by fetching ticker data,
calling Xai API for analysis, and storing results.

Takes a portfolio name, retrieves ticker data, calls Xai API,
and stores the analysis result in DynamoDB.

Required environment variables:
- PORTFOLIOS_TABLE (DynamoDB table name for portfolios)
- TICKER_DATA_TABLE (DynamoDB table name for ticker data)
- ANALYSES_TABLE (DynamoDB table name for storing analyses)
- XAI_API_URL (Xai API endpoint URL)
- XAI_API_KEY (Xai API key)
"""

import boto3
import json
import os
import requests
from datetime import datetime

# Environment variables
PORTFOLIOS_TABLE = os.environ.get('PORTFOLIOS_TABLE')
TICKER_DATA_TABLE = os.environ.get('TICKER_DATA_TABLE')
ANALYSES_TABLE = os.environ.get('ANALYSES_TABLE')
XAI_API_URL = os.environ.get('XAI_API_URL')
XAI_API_KEY = os.environ.get('XAI_API_KEY')

# Model configuration
#MODEL = 'grok-4-fast-reasoning'
MODEL = 'grok-4-latest'

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
portfolios_table = dynamodb.Table(PORTFOLIOS_TABLE)
ticker_table = dynamodb.Table(TICKER_DATA_TABLE)
analyses_table = dynamodb.Table(ANALYSES_TABLE)

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

    # Get dataAsOf from one of the ticker data
    data_as_of = list(ticker_data.values())[0].get('asOf')

    # Check if analysis already exists for this portfolio, model, and dataAsOf
    existing_analysis = analyses_table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('portfolio').eq(portfolio_name),
        FilterExpression=boto3.dynamodb.conditions.Attr('model').eq(MODEL) & boto3.dynamodb.conditions.Attr('dataAsOf').eq(data_as_of)
    )
    if existing_analysis['Items']:
        print(f"Analysis already exists for {portfolio_name} with model {MODEL} and dataAsOf {data_as_of}, skipping")
        return {'status': 'skipped', 'portfolio': portfolio_name, 'reason': 'already_exists'}

    # Convert Decimal to float
    ticker_data = decimal_to_float(ticker_data)

    # Create prompt
    portfolio_data = {
        'portfolio_name': portfolio_name,
        'tickers': ticker_data,
        'timestamp': datetime.utcnow().isoformat()
    }
    portfolio_json = json.dumps(portfolio_data, indent=2)
    prompt = (
        "Analyze this portfolio data and give each ticker an opportunity score. "
        "The opportunity score should indicate whether it is a good time to buy the ticker. "
        "The score should be on a scale from -10 to 10 with 10 being the best opportunity to buy. "
        "No item in the list needs to have a +10 or -10 ranking.  Try to assess in such a way that "
        "the ideal score (10/10) represents a very good buying opportunity. neutral rsi and price "
        "close to sma implies score of 0. Neutral zone for rsi is 45-55."
        "Include a brief reason why the score was assigned. "
        "Format the results as JSON , containing: " 
        "ticker, score, price, rsi, ma50, data asOf date, and reason. "
        f"\n\nPortfolio Data:\n{portfolio_json}"
    )

    # Call Xai API
    try:
        headers = {
            'Authorization': f'Bearer {XAI_API_KEY}',
            'Content-Type': 'application/json'
        }
        data = {
            'model': MODEL,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'max_tokens': 20000
        }
        response = requests.post(
            XAI_API_URL,
            headers=headers,
            data=json.dumps(data),
            timeout=300  # 5 minutes timeout
        )
        response.raise_for_status()
        result = response.json()
        analysis = result['choices'][0]['message']['content']

        # Parse JSON from analysis if present
        parsed_data = analysis

        # Store in DynamoDB
        current_timestamp = datetime.utcnow().isoformat()
        item = {
            'portfolio': portfolio_name,
            'timestamp': current_timestamp,
            'analysis': analysis,
            'prompt': prompt,
            'model': MODEL,
            'dataAsOf': data_as_of
        }
        if parsed_data:
            item['parsed_data'] = json.dumps(parsed_data)
        analyses_table.put_item(Item=item)

        print(f"Analysis completed and stored for {portfolio_name}")
        return {'status': 'success', 'portfolio': portfolio_name}

    except Exception as e:
        print(f"ERROR processing analysis for {portfolio_name}: {e}")
        # Store error in DB
        current_timestamp = datetime.utcnow().isoformat()
        analyses_table.put_item(
            Item={
                'portfolio': portfolio_name,
                'timestamp': current_timestamp,
                'analysis': f"Error: {str(e)}",
                'prompt': prompt,
                'model': MODEL,
                'dataAsOf': data_as_of
            }
        )
        return {'status': 'error', 'portfolio': portfolio_name, 'error': str(e)}
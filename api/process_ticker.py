"""
AWS Lambda function to process individual ticker messages from SQS queue.

Triggered by SQS messages containing ticker symbols, fetches financial data
from Polygon.io, and stores in DynamoDB.

Args:
    event: SQS event with messages
    context: Lambda context

Returns:
    dict: Success message
"""

import requests
import json
import os
import boto3
from datetime import datetime, timedelta
from decimal import Decimal

# Retrieve environment variables
API_KEY = os.environ.get('POLYGON_API_KEY')
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE')

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(DYNAMODB_TABLE)

def get_ticker_type(ticker):
    """
    Determine the asset type and format the ticker for Polygon API.

    Args:
        ticker (str): The ticker symbol

    Returns:
        tuple: (asset_type, formatted_ticker)
    """
    if ticker.startswith('^'):
        return 'index', f'I:{ticker[1:]}'
    elif '-USD' in ticker:
        return 'crypto', f'X:{ticker}'
    else:
        return 'stock', ticker

def fetch_price(ticker):
    """
    Fetch the most recent closing price for a ticker.

    Args:
        ticker (str): The ticker symbol

    Returns:
        float or None: The closing price and timestamp, or None if no data
    """
    ttype, pticker = get_ticker_type(ticker)
    print(f"DEBUG fetch_price: ticker={ticker}, type={ttype}, pticker={pticker}")
    to_date = datetime.now()
    from_date = to_date - timedelta(days=7)
    from_str = from_date.strftime('%Y-%m-%d')
    to_str = to_date.strftime('%Y-%m-%d')
    print(f"DEBUG fetch_price: date range {from_str} to {to_str}")

    if ttype == 'crypto':
        url = f'https://api.polygon.io/v3/aggs/ticker/{pticker}/range/1/day/{from_str}/{to_str}'
    else:
        url = f'https://api.polygon.io/v2/aggs/ticker/{pticker}/range/1/day/{from_str}/{to_str}'

    params = {'apiKey': API_KEY, 'limit': 1, 'sort': 'desc'}
    safe_params = {k: v if k != 'apiKey' else '***' for k, v in params.items()}
    print(f"DEBUG fetch_price: Requesting URL: {url} with params: {safe_params}")
    response = requests.get(url, params=params)
    print(f"DEBUG fetch_price: Response status: {response.status_code}")

    if response.status_code == 429:
        print(f"DEBUG fetch_price: Rate limit exceeded for {ticker}")
        return {'error': 'rate_limit'}

    data = response.json()
    print(f"DEBUG fetch_price: Response data: {json.dumps(data)}")

    if 'results' not in data or not data['results']:
        print(f"DEBUG fetch_price: No results in data for {ticker}")
        return None

    result = data['results'][0]
    price = result['c']
    timestamp_ms = result['t']
    print(f"DEBUG fetch_price: Extracted price: {price}, timestamp: {timestamp_ms}")
    return price, timestamp_ms

def fetch_indicator(ticker, indicator, window):
    """
    Fetch a technical indicator value for a ticker.

    Args:
        ticker (str): The ticker symbol
        indicator (str): The indicator type
        window (int): The period

    Returns:
        float or None: The indicator value
    """
    ttype, pticker = get_ticker_type(ticker)
    print(f"DEBUG fetch_indicator: ticker={ticker}, indicator={indicator}, window={window}, type={ttype}, pticker={pticker}")
    url = f'https://api.polygon.io/v1/indicators/{indicator}/{pticker}'
    params = {
        'apiKey': API_KEY,
        'timespan': 'day',
        'window': window,
        'series_type': 'close',
        'order': 'desc',
        'limit': 1
    }
    safe_params = {k: v if k != 'apiKey' else '***' for k, v in params.items()}
    print(f"DEBUG fetch_indicator: Requesting URL: {url} with params: {safe_params}")
    response = requests.get(url, params=params)
    print(f"DEBUG fetch_indicator: Response status: {response.status_code}")

    if response.status_code == 429:
        print(f"DEBUG fetch_indicator: Rate limit exceeded for {ticker} {indicator}")
        return {'error': 'rate_limit'}

    data = response.json()
    print(f"DEBUG fetch_indicator: Response data: {json.dumps(data)}")

    if 'results' not in data or 'values' not in data['results'] or not data['results']['values']:
        print(f"DEBUG fetch_indicator: No values in data for {ticker} {indicator}")
        return None
    value = data['results']['values'][0]['value']
    print(f"DEBUG fetch_indicator: Extracted value: {value}")
    return value

def get_latest_record(ticker):
    """
    Get the latest record for the ticker from DynamoDB.

    Args:
        ticker (str): The ticker symbol

    Returns:
        dict or None: The latest item
    """
    print(f"DEBUG get_latest_record: Getting latest for {ticker}")
    response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('ticker').eq(ticker),
        ScanIndexForward=False,
        Limit=1
    )
    items = response['Items']
    if items:
        latest = items[0]
        print(f"DEBUG get_latest_record: Latest record timestamp: {latest['timestamp']}, asOf: {latest.get('asOf')}")
        return latest
    else:
        print(f"DEBUG get_latest_record: No records for {ticker}")
        return None

def lambda_handler(event, context):
    """
    AWS Lambda handler for SQS messages.

    Processes each message containing a ticker symbol.
    """
    print("Starting SQS ticker processing")

    for record in event['Records']:
        body = json.loads(record['body'])
        ticker = body.get('ticker')
        if not ticker:
            print("No ticker in message, skipping")
            continue

        print(f"Processing ticker: {ticker}")

        # Fetch price data first to get asOf time
        print(f"Fetching price for {ticker}")
        price_result = fetch_price(ticker)
        if isinstance(price_result, dict) and price_result.get('error') == 'rate_limit':
            print(f"Rate limit exceeded for {ticker}, skipping")
            continue
        if price_result is None:
            print(f"No price data for {ticker}, skipping")
            continue

        price_value, timestamp_ms = price_result
        price_value = Decimal(str(price_value))
        as_of = datetime.fromtimestamp(timestamp_ms / 1000).isoformat()

        # Get latest record and check if data is newer
        latest = get_latest_record(ticker)
        if latest and as_of <= latest.get('asOf', ''):
            # Data not newer, skip without making further API calls
            print(f"Data not newer for {ticker}, skipping")
            action = 'skipped'
            continue

        # Data is newer, fetch additional indicators
        print(f"Fetching RSI for {ticker}")
        rsi = fetch_indicator(ticker, 'rsi', 14)
        if isinstance(rsi, dict) and rsi.get('error') == 'rate_limit':
            print(f"Rate limit exceeded for {ticker} RSI, skipping")
            continue
        rsi = Decimal(str(rsi)) if rsi is not None else None

        print(f"Fetching MA50 for {ticker}")
        ma50 = fetch_indicator(ticker, 'sma', 50)
        if isinstance(ma50, dict) and ma50.get('error') == 'rate_limit':
            print(f"Rate limit exceeded for {ticker} MA50, skipping")
            continue
        ma50 = Decimal(str(ma50)) if ma50 is not None else None

        current_timestamp = datetime.now().isoformat()

        # Insert new record
        print(f"Inserting new record for {ticker}")
        item = {
            'ticker': ticker,
            'timestamp': current_timestamp,
            'price': price_value,
            'asOf': as_of,
            'ma50': ma50,
            'rsi': rsi
        }
        table.put_item(Item=item)
        action = 'inserted'

        print(f"Completed processing ticker: {action}")

    return {'status': 'success'}
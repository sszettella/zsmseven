"""
AWS Lambda function to periodically fetch and store financial data for multiple ticker symbols.

This function integrates with the Polygon.io API to retrieve:
- Current price (closing price from the most recent trading day)
- AsOf date/time
- 50-day Simple Moving Average (SMA)
- RSI (Relative Strength Index, 14-day period)

It checks DynamoDB for existing records in the last 24 hours and skips if found.
Adds current timestamp and writes to DynamoDB.

Triggered by AWS EventBridge schedule.

Required environment variables:
- POLYGON_API_KEY (your Polygon.io API key)
- DYNAMODB_TABLE (DynamoDB table name)

Supported ticker formats:
- Stocks: NVDA, TSLA, etc.
- Crypto: BTC-USD
- ETFs: IAU, etc.
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

# List of tickers to process
TICKERS = ['NVDA', 'TSLA', 'X:BTC-USD', 'IAU', 'HOOD', 'PLTR', 'AVGO']

def get_next_ticker():
    """
    Get the next ticker to process without updating the state.

    Returns:
        str: The ticker symbol to process
    """
    try:
        # Try to get current state
        response = table.get_item(Key={'ticker': 'STATE', 'timestamp': 'current'})
        if 'Item' in response:
            current_index = int(response['Item'].get('last_index', 0))
        else:
            current_index = 0

        # Get next ticker
        ticker = TICKERS[current_index]

        print(f"DEBUG get_next_ticker: Processing {ticker} (index {current_index})")
        return ticker

    except Exception as e:
        print(f"ERROR get_next_ticker: {e}")
        # Fallback to first ticker
        return TICKERS[0]

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(DYNAMODB_TABLE)

def check_recent_record(ticker):
    """
    Check if a record for the ticker exists in DynamoDB within the last 24 hours.

    Args:
        ticker (str): The ticker symbol

    Returns:
        bool: True if a record exists, False otherwise
    """
    now = datetime.now()
    twenty_four_hours_ago = now - timedelta(hours=24)
    ts_str = twenty_four_hours_ago.isoformat()

    print(f"DEBUG check_recent_record: Checking for {ticker} since {ts_str}")
    response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('ticker').eq(ticker) &
                               boto3.dynamodb.conditions.Key('timestamp').gte(ts_str)
    )
    item_count = len(response['Items'])
    print(f"DEBUG check_recent_record: Found {item_count} recent records for {ticker}")
    if item_count > 0:
        print(f"DEBUG check_recent_record: Most recent timestamp: {response['Items'][0]['timestamp']}")

    return item_count > 0

def get_ticker_type(ticker):
    """
    Determine the asset type and format the ticker for Polygon API.

    Args:
        ticker (str): The ticker symbol (e.g., 'AAPL', '^SPX', 'BTC-USD')

    Returns:
        tuple: (asset_type, formatted_ticker)
            - asset_type: 'stock', 'index', or 'crypto'
            - formatted_ticker: Polygon API format (e.g., 'AAPL', 'I:SPX', 'X:BTC-USD')
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
        float or None: The closing price, or None if no data available
    """
    ttype, pticker = get_ticker_type(ticker)
    print(f"DEBUG fetch_price: ticker={ticker}, type={ttype}, pticker={pticker}")
    # Get data for the most recent trading days
    to_date = datetime.now()
    from_date = to_date - timedelta(days=7)
    from_str = from_date.strftime('%Y-%m-%d')
    to_str = to_date.strftime('%Y-%m-%d')
    print(f"DEBUG fetch_price: date range {from_str} to {to_str}")

    # Different API endpoints for crypto vs stocks/indices
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
    # Return the closing price ('c' field) and timestamp ('t' in milliseconds)
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
        indicator (str): The indicator type (e.g., 'rsi', 'sma')
        window (int): The period/window for the indicator (e.g., 14 for RSI, 50 for SMA)

    Returns:
        float or None: The indicator value, or None if no data available
    """
    ttype, pticker = get_ticker_type(ticker)
    print(f"DEBUG fetch_indicator: ticker={ticker}, indicator={indicator}, window={window}, type={ttype}, pticker={pticker}")
    url = f'https://api.polygon.io/v1/indicators/{indicator}/{pticker}'
    params = {
        'apiKey': API_KEY,
        'timespan': 'day',  # Daily timeframe
        'window': window,   # Period for the indicator
        'series_type': 'close',  # Use closing prices
        'order': 'desc',    # Most recent first
        'limit': 1          # Only get the latest value
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

def lambda_handler(event, context):
    """
    AWS Lambda handler function triggered by EventBridge schedule.

    Processes tickers in sequence, skipping those with recent records,
    fetches data from Polygon.io if needed, and stores in DynamoDB.

    Args:
        event (dict): EventBridge event (not used)
        context: Lambda context (not used)

    Returns:
        dict: Success message with ticker info or all_skipped
    """
    print("Starting scheduled data fetch")

    for _ in range(len(TICKERS)):
        # Get the next ticker to process
        ticker = get_next_ticker()
        print(f"Processing ticker: {ticker}")

        # Check if record exists in last 24 hours
        if check_recent_record(ticker):
            print(f"Record exists for {ticker} in last 24 hours, trying next")
            continue

        # Fetch financial data
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

        # Convert timestamp to ISO format
        as_of = datetime.fromtimestamp(timestamp_ms / 1000).isoformat()

        # Current timestamp
        current_timestamp = datetime.now().isoformat()

        # Prepare data for DynamoDB
        item = {
            'ticker': ticker,
            'timestamp': current_timestamp,
            'price': price_value,
            'asOf': as_of,
            'ma50': ma50,
            'rsi': rsi
        }

        # Write to DynamoDB
        table.put_item(Item=item)
        print(f"Stored data for {ticker}: {str(item)}")

        # Update state for next time
        current_index = TICKERS.index(ticker)
        next_index = (current_index + 1) % len(TICKERS)
        table.put_item(Item={
            'ticker': 'STATE',
            'timestamp': 'current',
            'last_index': str(next_index)
        })

        print("Completed processing ticker")
        return {'status': 'success', 'ticker': ticker}

    # If all tickers have recent records
    print("All tickers have recent records, skipping")
    return {'status': 'all_skipped'}
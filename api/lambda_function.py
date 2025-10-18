"""
AWS Lambda function to fetch financial data for a given ticker symbol.

This function integrates with the Polygon.io API to retrieve:
- Current price (closing price from the most recent trading day)
- RSI (Relative Strength Index, 14-day period)
- 50-day Simple Moving Average (SMA)

Usage:
- Deploy as an AWS Lambda function via Serverless Framework
- Call via HTTP GET request to the API Gateway endpoint
- Required query parameter: ticker (e.g., ?ticker=AAPL)
- Required environment variable: POLYGON_API_KEY (your Polygon.io API key)

Example API call:
GET /data?ticker=AAPL
Response: {"ticker": "AAPL", "price": 150.25, "rsi": 65.5, "ma50": 145.8}

Supported ticker formats:
- Stocks: AAPL, MSFT, GOOGL
- Crypto: BTC-USD, ETH-USD
- Indices: ^SPX, ^NDX (note the ^ prefix)
"""

import requests
import json
import os
from datetime import datetime, timedelta

# Retrieve Polygon.io API key from environment variables
API_KEY = os.environ.get('POLYGON_API_KEY')

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
    # Return the closing price ('c' field)
    price = data['results'][0]['c']
    print(f"DEBUG fetch_price: Extracted price: {price}")
    return price

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
    AWS Lambda handler function for API Gateway requests.

    Processes GET requests with a ticker query parameter and returns
    financial data including price, RSI, and 50-day MA.

    Args:
        event (dict): API Gateway event containing query parameters
        context: Lambda context (not used)

    Returns:
        dict: API Gateway response with status code and JSON body
    """
    # Extract ticker from query parameters
    ticker = event.get('queryStringParameters', {}).get('ticker')
    if not ticker:
        print("DEBUG: No ticker provided in request")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'ticker required'})
        }
    ticker = ticker.upper()
    print(f"DEBUG: Received request for ticker: {ticker}")

    # Fetch financial data
    print(f"DEBUG: Fetching price for {ticker}")
    price = fetch_price(ticker)
    print(f"DEBUG: Price fetched: {price}")

    if isinstance(price, dict) and price.get('error') == 'rate_limit':
        return {
            'statusCode': 429,
            'body': json.dumps({'error': 'exceeded the number of requests per minute'})
        }

    print(f"DEBUG: Fetching RSI for {ticker}")
    rsi = fetch_indicator(ticker, 'rsi', 14)  # 14-day RSI
    print(f"DEBUG: RSI fetched: {rsi}")
    print(f"DEBUG: Fetching MA50 for {ticker}")
    ma50 = fetch_indicator(ticker, 'sma', 50)  # 50-day Simple Moving Average
    print(f"DEBUG: MA50 fetched: {ma50}")

    if price is None:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': f'no price data for ticker {ticker}'})
        }

    # Prepare response data
    data = {
        'ticker': ticker,
        'price': price,
        'rsi': rsi,
        'ma50': ma50
    }

    return {
        'statusCode': 200,
        'body': json.dumps(data)
    }
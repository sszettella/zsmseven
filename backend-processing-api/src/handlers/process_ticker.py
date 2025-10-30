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
TICKER_DATA_TABLE = os.environ.get('TICKER_DATA_TABLE')
POSITIONS_TABLE = os.environ.get('POSITIONS_TABLE')

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
ticker_data_table = dynamodb.Table(TICKER_DATA_TABLE)
positions_table = dynamodb.Table(POSITIONS_TABLE)

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
    Get the latest record for the ticker from DynamoDB ticker-data table.

    Args:
        ticker (str): The ticker symbol

    Returns:
        dict or None: The latest item
    """
    print(f"DEBUG get_latest_record: Getting latest for {ticker} from {TICKER_DATA_TABLE}")
    response = ticker_data_table.query(
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

def update_position_prices(ticker, current_price, as_of, position_ids):
    """
    Update positions with current price and calculate P&L and market value.

    Args:
        ticker (str): The ticker symbol
        current_price (Decimal): Current market price
        as_of (str): Timestamp of the price data
        position_ids (list): List of position IDs to update
    """
    print(f"DEBUG update_position_prices: Updating {len(position_ids)} position(s) for {ticker}")
    print(f"DEBUG update_position_prices: Writing to table: {POSITIONS_TABLE}")

    updated_count = 0
    error_count = 0

    for position_id in position_ids:
        try:
            # Get current position data
            response = positions_table.get_item(Key={'id': position_id})

            if 'Item' not in response:
                print(f"  ✗ Position {position_id} not found, skipping")
                error_count += 1
                continue

            position = response['Item']
            shares = Decimal(str(position.get('shares', 0)))
            average_cost = Decimal(str(position.get('averageCost', 0)))
            cost_basis = Decimal(str(position.get('costBasis', 0)))

            # Calculate market value
            market_value = shares * current_price

            # Calculate unrealized P&L
            unrealized_pl = market_value - cost_basis

            # Update the position
            current_timestamp = datetime.now().isoformat()

            print(f"  Updating position {position_id}:")
            print(f"    Shares: {shares}, Avg Cost: {average_cost}, Cost Basis: {cost_basis}")
            print(f"    Current Price: {current_price} (as of {as_of})")
            print(f"    Market Value: {market_value} (calculated)")
            print(f"    Unrealized P&L: {unrealized_pl} (calculated)")

            positions_table.update_item(
                Key={'id': position_id},
                UpdateExpression='SET currentPrice = :price, updatedAt = :updated, marketValue = :mv, unrealizedPL = :pl',
                ExpressionAttributeValues={
                    ':price': current_price,
                    ':updated': current_timestamp,
                    ':mv': market_value,
                    ':pl': unrealized_pl
                }
            )

            updated_count += 1
            print(f"  ✓ Updated position {position_id} (UPDATE operation)")

        except Exception as e:
            error_count += 1
            print(f"  ✗ ERROR updating position {position_id}: {e}")

    print(f"DEBUG update_position_prices: Updated {updated_count} positions, {error_count} errors")

def lambda_handler(event, context):
    """
    AWS Lambda handler for SQS messages.

    Processes each message containing a ticker symbol and updates associated positions.
    """
    print("=" * 80)
    print("Starting SQS ticker processing")
    print(f"DEBUG: Ticker data table: {TICKER_DATA_TABLE}")
    print(f"DEBUG: Positions table: {POSITIONS_TABLE}")
    print("=" * 80)

    for record in event['Records']:
        body = json.loads(record['body'])
        ticker = body.get('ticker')
        position_ids = body.get('position_ids', [])

        if not ticker:
            print("No ticker in message, skipping")
            continue

        print(f"\nProcessing ticker: {ticker} (positions: {len(position_ids)})")

        # Fetch price data first to get asOf time
        print(f"Fetching price for {ticker} from Polygon API")
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

        print(f"Price fetched: {price_value} (as of {as_of})")

        # Get latest record and check if data is newer
        latest = get_latest_record(ticker)
        if latest and as_of <= latest.get('asOf', ''):
            # Data not newer, but still update positions with existing price
            print(f"Data not newer for {ticker}, but updating positions with current price")
            if position_ids:
                update_position_prices(ticker, price_value, as_of, position_ids)
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

        # Insert new record into ticker-data table
        print(f"DEBUG: Writing to {TICKER_DATA_TABLE} (INSERT operation)")
        item = {
            'ticker': ticker,
            'timestamp': current_timestamp,
            'price': price_value,
            'asOf': as_of,
            'ma50': ma50,
            'rsi': rsi
        }
        ticker_data_table.put_item(Item=item)
        print(f"✓ Inserted new ticker-data record for {ticker}")

        # Update all associated positions
        if position_ids:
            update_position_prices(ticker, price_value, as_of, position_ids)
        else:
            print(f"No position IDs to update for {ticker}")

        print(f"Completed processing ticker: {ticker}")

    print("=" * 80)
    print("Ticker processing complete")
    print("=" * 80)
    return {'status': 'success'}
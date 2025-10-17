import requests
import json
from datetime import datetime, timedelta

API_KEY = 'jdFWDwkRdMFTj1fVSakQwBtHg5gJ_jNK'

def get_ticker_type(ticker):
    if ticker.startswith('^'):
        return 'index', f'I:{ticker[1:]}'
    elif '-USD' in ticker:
        return 'crypto', f'X:{ticker}'
    else:
        return 'stock', ticker

def fetch_price(ticker):
    ttype, pticker = get_ticker_type(ticker)
    to_date = datetime.now()
    from_date = to_date - timedelta(days=1)
    from_str = from_date.strftime('%Y-%m-%d')
    to_str = to_date.strftime('%Y-%m-%d')
    if ttype == 'crypto':
        url = f'https://api.polygon.io/v3/aggs/ticker/{pticker}/range/1/day/{from_str}/{to_str}'
    else:
        url = f'https://api.polygon.io/v2/aggs/ticker/{pticker}/range/1/day/{from_str}/{to_str}'
    params = {'apiKey': API_KEY, 'limit': 1, 'sort': 'desc'}
    response = requests.get(url, params=params)
    data = response.json()
    if 'results' not in data or not data['results']:
        return None
    return data['results'][0]['c']

def fetch_indicator(ticker, indicator, window):
    ttype, pticker = get_ticker_type(ticker)
    url = f'https://api.polygon.io/v1/indicators/{indicator}/{pticker}'
    params = {
        'apiKey': API_KEY,
        'timespan': 'day',
        'window': window,
        'series_type': 'close',
        'order': 'desc',
        'limit': 1
    }
    response = requests.get(url, params=params)
    data = response.json()
    if 'results' not in data or 'values' not in data['results'] or not data['results']['values']:
        return None
    return data['results']['values'][0]['value']

def lambda_handler(event, context):
    ticker = event.get('queryStringParameters', {}).get('ticker')
    if not ticker:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'ticker required'})
        }
    price = fetch_price(ticker)
    rsi = fetch_indicator(ticker, 'rsi', 14)
    ma50 = fetch_indicator(ticker, 'sma', 50)
    if price is None:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'no price data'})
        }
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
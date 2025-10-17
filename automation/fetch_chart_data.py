import requests
import json
from datetime import datetime, timedelta

# Tickers
tickers = ['GC=F', 'BTC-USD']

# Calculate timestamps
now = datetime.now()
start_2025 = datetime(2025, 1, 1)
period1 = int(start_2025.timestamp())
period2 = int(now.timestamp())

for ticker in tickers:
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={period1}&period2={period2}&interval=1wk'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        timestamps = data['chart']['result'][0]['timestamp']
        prices = data['chart']['result'][0]['indicators']['quote'][0]['close']
        dates = [datetime.fromtimestamp(ts).strftime('%Y-%m-%d') for ts in timestamps]
        prices_clean = [p for p in prices if p is not None]
        dates_clean = dates[:len(prices_clean)]
        print(f"// {ticker}")
        print(f"const dates{ticker} = {dates_clean};")
        print(f"const prices{ticker} = {prices_clean};")
    else:
        print(f"Failed to fetch {ticker}")
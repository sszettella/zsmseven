import re
import requests
import os

# Tickers to update
tickers = ['NVDA', 'AVGO', 'TSLA', 'PLTR', 'HOOD', 'IAU', '^GSPC', '^IXIC']

# Fetch BTC price
btc_response = requests.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
btc_price = btc_response.json()['bitcoin']['usd']

# Fetch stock and index prices
prices = {'BTC-USD': btc_price}
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
for ticker in tickers:
    try:
        response = requests.get(f'https://query1.finance.yahoo.com/v7/finance/quote?symbols={ticker}', headers=headers)
        data = response.json()
        price = data['quoteResponse']['result'][0]['regularMarketPrice']
        prices[ticker] = round(price, 2)
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        # Keep existing price

# Read the tracker file
tracker_path = os.path.join(os.path.dirname(__file__), '..', 'tracker', 'index.html')
with open(tracker_path, 'r') as f:
    content = f.read()

# Update the currentPrices object
def update_prices(match):
    lines = match.group(0).split('\n')
    updated_lines = []
    for line in lines:
        for ticker, price in prices.items():
            if f"'{ticker}':" in line:
                # Update the price
                line = re.sub(r"'{ticker}': [\d.]+".replace('{ticker}', ticker), f"'{ticker}': {price}", line)
                break
        updated_lines.append(line)
    return '\n'.join(updated_lines)

# Find and update the currentPrices object
pattern = r'const currentPrices = \{[\s\S]*?\};'
updated_content = re.sub(pattern, update_prices, content, flags=re.MULTILINE)

# Write back
with open(tracker_path, 'w') as f:
    f.write(updated_content)

print("Tracker updated with latest prices.")
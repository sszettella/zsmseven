import boto3
from datetime import datetime

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('portfolios-dev')

# Insert the portfolio item
table.put_item(
    Item={
        'portfolio_name': 'ZSM Seven',
        'tickers': ['AVGO', 'IBIT', 'IAU', 'HOOD', 'PLTY', 'TSLA', 'NVDA'],
        'last_update': datetime.utcnow().isoformat()
    }
)

print("Portfolio item inserted successfully")
import boto3
from datetime import datetime

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('portfolios-dev')

# Insert the portfolio item
table.put_item(
    Item={
        'portfolio_name': 'DIV Seven',
        'tickers': ['PLTY', 'MSTY', 'BITI', 'HOOY', 'NVDY', 'STRC', 'NVDA'],
        'last_update': datetime.utcnow().isoformat()
    }
)

print("Portfolio item inserted successfully")
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# Create table
table = dynamodb.create_table(
    TableName='portfolios-dev',
    KeySchema=[
        {
            'AttributeName': 'portfolio_name',
            'KeyType': 'HASH'
        }
    ],
    AttributeDefinitions=[
        {
            'AttributeName': 'portfolio_name',
            'AttributeType': 'S'
        }
    ],
    BillingMode='PAY_PER_REQUEST'
)

print("Table created, waiting...")
table.wait_until_exists()
print("Table ready")

# Insert item
table.put_item(
    Item={
        'portfolio_name': 'ZSM Seven',
        'tickers': ['AVGO', 'IBIT', 'IAU', 'HOOD', 'PLTY', 'TSLA', 'NVDA'],
        'last_update': datetime.utcnow().isoformat()
    }
)

print("Item inserted")
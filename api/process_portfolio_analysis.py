"""
AWS Lambda function to process portfolio analysis by calling Xai API
and storing the result in DynamoDB.

Triggered asynchronously with portfolio data, makes Xai API call,
and stores the analysis result.

Required environment variables:
- ANALYSES_TABLE (DynamoDB table name for storing analyses)
- XAI_API_URL (Xai API endpoint URL)
- XAI_API_KEY (Xai API key)
"""

import boto3
import json
import os
import requests
from datetime import datetime

# Environment variables
ANALYSES_TABLE = os.environ.get('ANALYSES_TABLE')
XAI_API_URL = os.environ.get('XAI_API_URL')
XAI_API_KEY = os.environ.get('XAI_API_KEY')

# Model configuration
MODEL = 'grok-4-latest'

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
analyses_table = dynamodb.Table(ANALYSES_TABLE)

def decimal_to_float(obj):
    """
    Convert Decimal objects to float for JSON serialization.
    """
    if isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    elif hasattr(obj, '__float__'):  # Decimal
        return float(obj)
    else:
        return obj

def lambda_handler(event, context):
    """
    AWS Lambda handler function.

    Processes portfolio analysis request.

    Args:
        event (dict): Event with portfolio_name, tickers, etc.
        context: Lambda context

    Returns:
        dict: Success message
    """
    print(f"Received event: {event}")
    portfolio_name = event.get('portfolio_name')
    ticker_data = event.get('ticker_data', {})

    print(f"Processing analysis for portfolio: {portfolio_name}")
    print(f"Ticker data keys: {list(ticker_data.keys()) if ticker_data else 'None'}")

    # Convert Decimal to float
    ticker_data = decimal_to_float(ticker_data)

    # Create prompt
    portfolio_data = {
        'portfolio_name': portfolio_name,
        'tickers': ticker_data,
        'timestamp': datetime.utcnow().isoformat()
    }
    prompt = f"Analyze this portfolio data and give each ticker an opportunity score. The opportunity score should indicate whether it is a good time to buy the ticker. The score should be on a scale from -10 to 10 with 10 being the best opportunity to buy. Rank the tickers in order from highest opportunity score to lowest within the portfolio.\n\nPortfolio Data:\n{json.dumps(portfolio_data, indent=2)}"

    # Call Xai API
    try:
        headers = {
            'Authorization': f'Bearer {XAI_API_KEY}',
            'Content-Type': 'application/json'
        }
        data = {
            'model': MODEL,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'max_tokens': 20000
        }
        response = requests.post(
            XAI_API_URL,
            headers=headers,
            data=json.dumps(data),
            timeout=300  # 5 minutes timeout
        )
        response.raise_for_status()
        result = response.json()
        analysis = result['choices'][0]['message']['content']

        # Store in DynamoDB
        current_timestamp = datetime.utcnow().isoformat()
        analyses_table.put_item(
            Item={
                'portfolio': portfolio_name,
                'timestamp': current_timestamp,
                'analysis': analysis,
                'prompt': prompt,
                'model': MODEL
            }
        )

        print(f"Analysis completed and stored for {portfolio_name}")
        return {'status': 'success', 'portfolio': portfolio_name}

    except Exception as e:
        print(f"ERROR processing analysis for {portfolio_name}: {e}")
        # Store error in DB
        current_timestamp = datetime.utcnow().isoformat()
        analyses_table.put_item(
            Item={
                'portfolio': portfolio_name,
                'timestamp': current_timestamp,
                'analysis': f"Error: {str(e)}",
                'prompt': prompt
            }
        )
        return {'status': 'error', 'portfolio': portfolio_name, 'error': str(e)}
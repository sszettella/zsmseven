"""
AWS Lambda function to retrieve the latest portfolio analysis,
convert markdown to HTML, and return it.

Takes a portfolio name, fetches the most recent analysis from DynamoDB,
converts the markdown content to HTML, and returns it.
"""

import boto3
import json
import os
import markdown
from datetime import datetime

# Environment variables
ANALYSES_TABLE = os.environ.get('ANALYSES_TABLE')

# DynamoDB client
dynamodb = boto3.resource('dynamodb')
analyses_table = dynamodb.Table(ANALYSES_TABLE)

def lambda_handler(event, context):
    """
    AWS Lambda handler function.

    Retrieves the latest analysis for a portfolio and converts to HTML.

    Args:
        event (dict): Event with portfolio_name
        context: Lambda context

    Returns:
        dict: HTML content or error
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': ''
        }

    portfolio_name = event.get('queryStringParameters', {}).get('portfolio_name')
    if not portfolio_name:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'portfolio_name required'}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            }
        }

    try:
        # Query for the latest analysis
        response = analyses_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('portfolio').eq(portfolio_name),
            ScanIndexForward=False,  # Most recent first
            Limit=1
        )
        items = response['Items']
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f'No analysis found for portfolio {portfolio_name}'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                }
            }

        analysis = items[0]['analysis']

        # Parse JSON analysis
        try:
            analysis_data = json.loads(analysis)
        except json.JSONDecodeError:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Invalid JSON in analysis'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                }
            }

        return {
            'statusCode': 200,
            'body': json.dumps(analysis_data),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            }
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            }
        }
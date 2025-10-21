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

        # Convert markdown to HTML
        html_content = markdown.markdown(analysis, extensions=['fenced_code', 'tables'])

        # Wrap tables in responsive div (same as publish_pipeline)
        import re
        html_content = re.sub(r'(<table[^>]*>.*?</table>)', r'<div class="table-responsive">\1</div>', html_content, flags=re.DOTALL)

        return {
            'statusCode': 200,
            'body': html_content,
            'headers': {
                'Content-Type': 'text/html',
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
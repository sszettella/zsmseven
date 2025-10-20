#!/usr/bin/env python3
"""
Script to invoke the process_portfolio_analysis Lambda function
with a specified portfolio name.

Usage: python invoke_portfolio_analysis.py <portfolio_name>
"""

import boto3
import json
import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python invoke_portfolio_analysis.py <portfolio_name>")
        sys.exit(1)

    portfolio_name = sys.argv[1]

    # Initialize Lambda client
    lambda_client = boto3.client('lambda', region_name='us-east-1')

    # Payload
    payload = {
        'portfolio_name': portfolio_name
    }

    try:
        response = lambda_client.invoke(
            FunctionName='zsmseven-tracker-api-dev-analyzePortfolio',
            InvocationType='Event',  # Asynchronous
            Payload=json.dumps(payload)
        )
        print(f"Successfully invoked analysis for portfolio: {portfolio_name}")
        print(f"Response: {response}")
    except Exception as e:
        print(f"Error invoking Lambda: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""
Script to invoke the processTickers Lambda function.
"""

import boto3

def main():
    # Initialize Lambda client
    lambda_client = boto3.client('lambda', region_name='us-east-1')

    try:
        response = lambda_client.invoke(
            FunctionName='zsmseven-tracker-api-dev-processTickers',
            InvocationType='Event'  # Asynchronous
        )
        print("Successfully invoked processTickers Lambda")
        print(f"Response: {response}")
    except Exception as e:
        print(f"Error invoking Lambda: {e}")

if __name__ == '__main__':
    main()
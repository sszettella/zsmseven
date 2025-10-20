#!/bin/bash
aws lambda invoke --function-name zsmseven-tracker-api-dev-processTickers --region us-east-1 output.json
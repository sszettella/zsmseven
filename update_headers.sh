#!/bin/bash
# Script to regenerate static blog files with new header
cd /Users/sszettella/Documents/GitHub/zsmseven
python publish_pipeline.py &
sleep 2
pkill -f publish_pipeline.py
echo "Static files regenerated"

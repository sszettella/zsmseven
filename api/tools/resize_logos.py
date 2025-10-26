from PIL import Image
import os

def check_size(filepath):
    if os.path.exists(filepath):
        img = Image.open(filepath)
        print(f"Size of {filepath}: {img.size}")
    else:
        print(f"File {filepath} not found")

# Check sizes
check_size('static/zsmlogo.jpeg')
check_size('www/static/zsmlogo.jpeg')
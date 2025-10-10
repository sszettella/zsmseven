import requests
import json
import os
from datetime import datetime

# Local variable for the prompt - source from file
try:
    prompt_file_path = os.path.join(os.path.dirname(__file__), "post_prompt.txt")
    with open(prompt_file_path, "r") as f:
        prompt = f.read()
    # Append current date
    current_date = datetime.now().strftime("%Y-%m-%d")
    prompt += f"\n\ntoday is {current_date}.  The post and byline should be current as of today."
except FileNotFoundError:
    raise ValueError("post_prompt.txt file not found")

# xAI API endpoint and model
api_url = "https://api.x.ai/v1/chat/completions"
model = "grok-4-fast-reasoning"

# Read API key from xai_api_key file
try:
    key_file_path = os.path.join(os.path.dirname(__file__), "xai_api_key")
    with open(key_file_path, "r") as f:
        api_key = f.read().strip()
    if not api_key:
        raise ValueError("API key file is empty")
except FileNotFoundError:
    raise ValueError("xai_api_key file not found")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

data = {
    "model": model,
    "messages": [
        {
            "role": "user",
            "content": prompt
        }
    ],
    "max_tokens": 20000  # Adjust as needed
}

response = requests.post(api_url, headers=headers, data=json.dumps(data))

if response.status_code == 200:
    result = response.json()
    blog_post = result["choices"][0]["message"]["content"]

    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"g_{timestamp}.md"
    script_dir = os.path.dirname(__file__)
    posts_dir = os.path.join(script_dir, "..", "posts")
    os.makedirs(posts_dir, exist_ok=True)
    filepath = os.path.join(posts_dir, filename)

    with open(filepath, "w") as f:
        f.write(blog_post)

    print(f"Blog post saved to {filepath}")
else:
    print(f"Error: {response.status_code} - {response.text}")
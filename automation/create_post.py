import requests
import json
import os
import re
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
#model = "grok-4-fast-reasoning"
model = "grok-4-latest"  # more expensive, slower

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

    # Parse title from frontmatter and rename file
    lines = blog_post.split('\n')
    title = None
    for line in lines:
        if line.startswith('title: '):
            title = line.split('title: ', 1)[1].strip().strip('"')
            break

    if title:
        # Shorten title: lowercase, replace non-alphanum with _, keep spaces as _
        shortened = re.sub(r'[^a-zA-Z0-9\s]', '', title).lower().replace(' ', '_')
        # Ensure shortened title is reasonable length (total filename should be <80 chars)
        if len(shortened) > 30:  # leave room for prefix and suffix
            shortened = shortened[:30]
        # Date suffix
        date_str = datetime.now().strftime("%Y%m%d")
        new_filename = f"g_{shortened}_{date_str}.md"
        new_filepath = os.path.join(posts_dir, new_filename)
        # Rename the file
        os.rename(filepath, new_filepath)
        filepath = new_filepath  # update for print

    print(f"Blog post saved to {filepath}")

    # Validation step
    try:
        validate_prompt_file_path = os.path.join(os.path.dirname(__file__), "validate_post_prompt.txt")
        with open(validate_prompt_file_path, "r") as f:
            validate_prompt = f.read()
        # Append current date
        validate_prompt += f"\n\ntoday is {current_date}.  The validation should be current as of today."
        # Append the blog post
        validate_prompt += f"\n\nHere is the post to validate:\n\n{blog_post}"

        # API call for validation
        data_validate = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": validate_prompt
                }
            ],
            "max_tokens": 20000
        }

        response_validate = requests.post(api_url, headers=headers, data=json.dumps(data_validate))

        if response_validate.status_code == 200:
            result_validate = response_validate.json()
            validation = result_validate["choices"][0]["message"]["content"]
            # Save validation to file with v_ prefix
            validation_filename = os.path.basename(filepath).replace('g_', 'v_', 1)
            validation_filepath = os.path.join(posts_dir, validation_filename)
            with open(validation_filepath, "w") as f:
                f.write(validation)
            print(f"Validation saved to {validation_filepath}")
        else:
            print(f"Validation error: {response_validate.status_code} - {response_validate.text}")
    except FileNotFoundError:
        print("validate_post_prompt.txt file not found, skipping validation")

else:
    print(f"Error: {response.status_code} - {response.text}")
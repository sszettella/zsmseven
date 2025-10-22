import os
import frontmatter
import shutil
import re

posts_dir = 'posts'
posts_new_dir = '_posts'

if not os.path.exists(posts_new_dir):
    os.makedirs(posts_new_dir)

for filename in os.listdir(posts_dir):
    if filename.endswith('.md'):
        file_path = os.path.join(posts_dir, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)
        date = post.get('date')
        title = post.get('title', 'untitled')
        if date:
            # Assume date is string like '2025-10-22'
            date_str = str(date)
            # Create slug from title
            slug = re.sub(r'[^\w\s-]', '', title.lower())
            slug = re.sub(r'[\s_-]+', '-', slug)
            slug = slug.strip('-')
            new_filename = f"{date_str}-{slug}.md"
            shutil.move(file_path, os.path.join(posts_new_dir, new_filename))
            print(f"Moved {filename} to {new_filename}")
import os
import markdown
from flask import Flask, render_template, render_template_string
import frontmatter
from datetime import datetime
import shutil
import sys

app = Flask(__name__)

# Configuration
POSTS_DIR = "posts"
OUTPUT_DIR = "static_site"
TEMPLATE_DIR = "templates"

# Ensure output directory exists
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def convert_markdown_to_html():
    """Convert all Markdown posts to HTML."""
    posts = []
    if not os.path.exists(POSTS_DIR):
        os.makedirs(POSTS_DIR)
        return posts  # Return empty list if no posts directory
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith(".md"):
            file_path = os.path.join(POSTS_DIR, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    post = frontmatter.load(f)
                    # Convert Markdown content to HTML
                    post.content = markdown.markdown(post.content, extensions=['fenced_code','tables'])
                    posts.append({
                        'title': post.get('title', 'Untitled'),
                        'date': post.get('date', datetime.now().strftime('%Y-%m-%d')),
                        'content': post.content,
                        'slug': filename.replace('.md', '')
                    })
            except Exception as e:
                print(f"Error processing {filename}: {e}")
    # Sort posts by date in descending order (newest first)
    posts.sort(key=lambda p: p['date'], reverse=True)
    return posts

def generate_static_site():
    """Generate static HTML files from posts."""
    with app.app_context():  # Create Flask app context
        posts = convert_markdown_to_html()
        
        # Copy static assets
        if os.path.exists('static'):
            shutil.copytree('static', os.path.join(OUTPUT_DIR, 'static'), dirs_exist_ok=True)
        
        # Generate index page
        index_template_path = os.path.join(TEMPLATE_DIR, 'index.html')
        if os.path.exists(index_template_path):
            with open(index_template_path, 'r', encoding='utf-8') as f:
                template = f.read()
            with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(render_template_string(template, posts=posts))
        
        # Generate individual post pages
        post_template_path = os.path.join(TEMPLATE_DIR, 'post.html')
        if os.path.exists(post_template_path):
            with open(post_template_path, 'r', encoding='utf-8') as f:
                template = f.read()
            for post in posts:
                with open(os.path.join(OUTPUT_DIR, f"{post['slug']}.html"), 'w', encoding='utf-8') as f:
                    f.write(render_template_string(template, post=post))

@app.route('/')
def index():
    posts = convert_markdown_to_html()
    return render_template('index.html', posts=posts)

@app.route('/post/<slug>')
def post(slug):
    posts = convert_markdown_to_html()
    post = next((p for p in posts if p['slug'] == slug), None)
    if post:
        return render_template('post.html', post=post)
    return "Post not found", 404

if __name__ == '__main__':
    # Check if running in CI environment (e.g., GitHub Actions)
    if 'CI' in os.environ:
        # Only generate static site for CI
        generate_static_site()
        sys.exit(0)  # Exit cleanly after generating static site
    else:
        # Run Flask server locally for development
        generate_static_site()  # Generate static files on startup
        app.run(debug=True)
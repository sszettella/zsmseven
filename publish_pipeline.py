import os
import markdown
from flask import Flask, render_template, render_template_string, send_from_directory
import frontmatter
from datetime import datetime, date
import shutil
import sys
import re

app = Flask(__name__)

# Configuration
POSTS_DIR = "posts"
OUTPUT_DIR = "static_site"
TEMPLATE_DIR = "templates"

# Ensure output directory exists
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def shift_headings(content):
    """Shift all Markdown headings down by one level."""
    def repl(match):
        level = len(match.group(1))
        return '#' * (level + 1) + ' '
    return re.sub(r'^(#+) ', repl, content, flags=re.MULTILINE)

def convert_markdown_to_html():
    """Convert all Markdown posts to HTML."""
    posts = []
    if not os.path.exists(POSTS_DIR):
        os.makedirs(POSTS_DIR)
        return posts  # Return empty list if no posts directory
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith(".md") and filename != 'portfolio_analysis.md':
            file_path = os.path.join(POSTS_DIR, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    post = frontmatter.load(f)
                    # Shift headings down by one level
                    post.content = shift_headings(post.content)
                    # Convert Markdown content to HTML
                    post.content = markdown.markdown(post.content, extensions=['fenced_code','tables'])
                    # Wrap tables in responsive div
                    post.content = re.sub(r'(<table[^>]*>.*?</table>)', r'<div class="table-responsive">\1</div>', post.content, flags=re.DOTALL)
                    # Parse date consistently
                    date_obj = post.get('date')
                    if isinstance(date_obj, str):
                        try:
                            date_obj = datetime.strptime(date_obj, '%Y-%m-%d').date()
                        except ValueError:
                            date_obj = datetime.now().date()
                    elif isinstance(date_obj, datetime):
                        date_obj = date_obj.date()
                    elif not isinstance(date_obj, date):
                        date_obj = datetime.now().date()
                    posts.append({
                        'title': post.get('title', 'Untitled'),
                        'date': date_obj,
                        'content': post.content,
                        'slug': filename.replace('.md', ''),
                        'description': post.get('description', ''),
                        'tags': post['tags'] if 'tags' in post else []
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

        # Copy tracker directory
        if os.path.exists('tracker'):
            shutil.copytree('tracker', os.path.join(OUTPUT_DIR, 'tracker'), dirs_exist_ok=True)
        
        # Generate index page
        index_template_path = os.path.join(TEMPLATE_DIR, 'index.html')
        if os.path.exists(index_template_path):
            with open(index_template_path, 'r', encoding='utf-8') as f:
                template = f.read()
            with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(render_template_string(template, posts=posts, is_static=True))
        
        # Generate individual post pages
        post_template_path = os.path.join(TEMPLATE_DIR, 'post.html')
        if os.path.exists(post_template_path):
            with open(post_template_path, 'r', encoding='utf-8') as f:
                template = f.read()
            for post in posts:
                with open(os.path.join(OUTPUT_DIR, f"{post['slug']}.html"), 'w', encoding='utf-8') as f:
                    f.write(render_template_string(template, post=post, posts=posts, is_static=True))

        # Generate archive page
        archive_template_path = os.path.join(TEMPLATE_DIR, 'archive.html')
        if os.path.exists(archive_template_path):
            with open(archive_template_path, 'r', encoding='utf-8') as f:
                template = f.read()
            with open(os.path.join(OUTPUT_DIR, 'archive.html'), 'w', encoding='utf-8') as f:
                f.write(render_template_string(template, posts=posts, is_static=True))

        # Generate portfolio analysis page separately
        portfolio_file = os.path.join(POSTS_DIR, 'portfolio_analysis.md')
        if os.path.exists(portfolio_file):
            with open(portfolio_file, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
                post.content = shift_headings(post.content)
                post.content = markdown.markdown(post.content, extensions=['fenced_code','tables'])
                post.content = re.sub(r'(<table[^>]*>.*?</table>)', r'<div class="table-responsive">\1</div>', post.content, flags=re.DOTALL)
                date_obj = post.get('date')
                if isinstance(date_obj, str):
                    try:
                        date_obj = datetime.strptime(date_obj, '%Y-%m-%d').date()
                    except ValueError:
                        date_obj = datetime.now().date()
                elif isinstance(date_obj, datetime):
                    date_obj = date_obj.date()
                elif not isinstance(date_obj, date):
                    date_obj = datetime.now().date()
                portfolio_post = {
                    'title': post.get('title', 'Untitled'),
                    'date': date_obj,
                    'content': post.content,
                    'slug': 'portfolio_analysis',
                    'description': post.get('description', ''),
                    'tags': post['tags'] if 'tags' in post else []
                }
            post_template_path = os.path.join(TEMPLATE_DIR, 'post.html')
            if os.path.exists(post_template_path):
                with open(post_template_path, 'r', encoding='utf-8') as f:
                    template = f.read()
                with open(os.path.join(OUTPUT_DIR, 'portfolio_analysis.html'), 'w', encoding='utf-8') as f:
                    f.write(render_template_string(template, post=portfolio_post, posts=posts, is_static=True))

@app.route('/')
def index():
    posts = convert_markdown_to_html()
    # Adjust links in post contents for Flask
    import re
    for post in posts:
        post['content'] = re.sub(r'href="\./(.*?)\.html"', r'href="/post/\1"', post['content'])
    return render_template('index.html', posts=posts, is_static=False)

@app.route('/post/<slug>')
def post(slug):
    posts = convert_markdown_to_html()
    post = next((p for p in posts if p['slug'] == slug), None)
    if post:
        # Adjust links in content for Flask (change ./slug.html to /post/slug)
        import re
        post['content'] = re.sub(r'href="\./(.*?)\.html"', r'href="/post/\1"', post['content'])
        return render_template('post.html', post=post, posts=posts, is_static=False)
    return "Post not found", 404

@app.route('/archive')
def archive():
    posts = convert_markdown_to_html()
    return render_template('archive.html', posts=posts, is_static=False)

@app.route('/post/portfolio_analysis')
def portfolio_analysis():
    posts = convert_markdown_to_html()
    # Load portfolio analysis separately
    portfolio_file = os.path.join(POSTS_DIR, 'portfolio_analysis.md')
    if os.path.exists(portfolio_file):
        with open(portfolio_file, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)
            post.content = shift_headings(post.content)
            post.content = markdown.markdown(post.content, extensions=['fenced_code','tables'])
            post.content = re.sub(r'(<table[^>]*>.*?</table>)', r'<div class="table-responsive">\1</div>', post.content, flags=re.DOTALL)
            for post_item in posts:
                post_item['content'] = re.sub(r'href="\./(.*?)\.html"', r'href="/post/\1"', post_item['content'])
            date_obj = post.get('date')
            if isinstance(date_obj, str):
                try:
                    date_obj = datetime.strptime(date_obj, '%Y-%m-%d').date()
                except ValueError:
                    date_obj = datetime.now().date()
            elif isinstance(date_obj, datetime):
                date_obj = date_obj.date()
            elif not isinstance(date_obj, date):
                date_obj = datetime.now().date()
            portfolio_post = {
                'title': post.get('title', 'Untitled'),
                'date': date_obj,
                'content': post.content,
                'slug': 'portfolio_analysis',
                'description': post.get('description', ''),
                'tags': post['tags'] if 'tags' in post else []
            }
            # Adjust links
            portfolio_post['content'] = re.sub(r'href="\./(.*?)\.html"', r'href="/post/\1"', portfolio_post['content'])
        return render_template('post.html', post=portfolio_post, posts=posts, is_static=False)
    return "Post not found", 404

@app.route('/tracker/')
def tracker():
    return send_from_directory('tracker', 'index.html')

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
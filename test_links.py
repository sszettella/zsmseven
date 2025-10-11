import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Configuration
BASE_URLS = ["http://127.0.0.1:5000", "https://blog.zsmproperties.com"]

visited = set()
broken_links = []

def check_link(url):
    if url.startswith("https://x.com/zsmproperties"):
        return True, None
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        if response.status_code == 200:
            return True, None
        else:
            return False, response.status_code
    except requests.RequestException as e:
        return False, str(e)

def crawl_page(url, base_url, visited, broken_links):
    if url in visited:
        return
    visited.add(url)
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            broken_links.append({'url': url, 'reason': f"HTTP {response.status_code}", 'text': ''})
            return
        soup = BeautifulSoup(response.content, 'html.parser')
        # Find all links and resources
        for tag in soup.find_all(['a', 'link', 'script', 'img']):
            href = tag.get('href') or tag.get('src')
            if href:
                full_url = urljoin(url, href)
                parsed_full = urlparse(full_url)
                parsed_base = urlparse(base_url)
                if parsed_full.netloc == parsed_base.netloc or not parsed_full.netloc:
                    # Internal link or relative
                    if full_url not in visited:
                        crawl_page(full_url, base_url, visited, broken_links)
                else:
                    # External link or resource
                    ok, status = check_link(full_url)
                    if not ok:
                        broken_links.append({'url': full_url, 'reason': status, 'text': tag.get_text().strip() if tag.name == 'a' else ''})
    except requests.RequestException as e:
        broken_links.append({'url': url, 'reason': str(e), 'text': ''})

if __name__ == "__main__":
    for base_url in BASE_URLS:
        visited = set()
        broken_links = []
        print(f"Checking {base_url}...")
        # Start crawling from index
        start_url = base_url if "127.0.0.1" in base_url else urljoin(base_url, "index.html")
        crawl_page(start_url, base_url, visited, broken_links)

        # Generate report
        if broken_links:
            report = f"Broken links found on {base_url}:\n"
            for link in broken_links:
                text_part = f" (text: '{link['text']}')" if link['text'] else ""
                report += f"{link['url']}: {link['reason']}{text_part}\n"
        else:
            report = f"All links are working on {base_url}!"

        print(report)
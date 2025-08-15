import requests
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Get request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Parse form data or JSON
            try:
                data = json.loads(post_data.decode('utf-8'))
                download_url = data.get('download_url')
                filename = data.get('filename', 'video.mp4')
            except json.JSONDecodeError:
                # Try parsing as form data
                form_data = parse_qs(post_data.decode('utf-8'))
                download_url = form_data.get('download_url', [None])[0]
                filename = form_data.get('filename', ['video.mp4'])[0]
            
            if not download_url:
                self.send_error(400, "Missing download URL")
                return
            
            # Clean filename - remove invalid characters
            import re
            filename = re.sub(r'[^a-zA-Z0-9\s\-_\.]', '_', filename)
            
            # Stream the file from the external URL
            response = requests.get(download_url, stream=True, timeout=30)
            
            if response.status_code != 200:
                self.send_error(response.status_code, "Failed to fetch video")
                return
            
            # Set headers for file download
            self.send_response(200)
            self.send_header('Content-Type', 'video/mp4')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            
            # Get content length if available
            content_length = response.headers.get('Content-Length')
            if content_length:
                self.send_header('Content-Length', content_length)
            
            self.end_headers()
            
            # Stream the content
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    self.wfile.write(chunk)
                    
        except Exception as e:
            self.send_error(500, f"Download error: {str(e)}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
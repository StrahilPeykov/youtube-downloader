import json
import yt_dlp
import re
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        try:
            # Get request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            url = data.get('url', '').strip()
            
            if not url:
                self.wfile.write(json.dumps({
                    'error': 'URL is required'
                }).encode('utf-8'))
                return
            
            # Validate YouTube URL
            youtube_regex = r'^(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+'
            if not re.match(youtube_regex, url):
                self.wfile.write(json.dumps({
                    'error': 'Invalid YouTube URL'
                }).encode('utf-8'))
                return

            # Configure yt-dlp options
            ydl_opts = {
                'format': 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
                'noplaylist': True,
                'extractaudio': False,
                'audioformat': 'mp3',
                'ignoreerrors': True,
                'no_warnings': True,
                'quiet': True,
            }

            # Extract video information
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    self.wfile.write(json.dumps({
                        'error': 'Could not extract video information'
                    }).encode('utf-8'))
                    return

                # Format duration
                duration_seconds = info.get('duration', 0)
                if duration_seconds:
                    minutes = duration_seconds // 60
                    seconds = duration_seconds % 60
                    duration_str = f"{minutes}:{seconds:02d}"
                else:
                    duration_str = "Unknown"

                # Get the best quality download URL
                formats = info.get('formats', [])
                download_url = None
                
                # Try to find best mp4 format
                for fmt in reversed(formats):
                    if fmt.get('ext') == 'mp4' and fmt.get('url'):
                        download_url = fmt['url']
                        break
                
                # Fallback to any format with URL
                if not download_url:
                    for fmt in reversed(formats):
                        if fmt.get('url'):
                            download_url = fmt['url']
                            break

                # Prepare response
                video_info = {
                    'title': info.get('title', 'Unknown Title'),
                    'duration': duration_str,
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', 'Unknown'),
                    'download_url': download_url or info.get('webpage_url', url)
                }

                response = {
                    'success': True,
                    'video_info': video_info
                }

                self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            error_response = {
                'error': f'Error processing video: {str(e)}'
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
import json
import yt_dlp
import re
import os
import tempfile
import uuid
import base64
import time
import random
from http.server import BaseHTTPRequestHandler

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
            action = data.get('action', 'info')  # 'info' or 'get_download_url'
            
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

            # Add random delay to avoid detection
            time.sleep(random.uniform(0.5, 2.0))

            if action == 'info':
                # Enhanced yt-dlp options to avoid bot detection
                ydl_opts = {
                    'format': 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
                    'noplaylist': True,
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': False,
                    'cookiefile': None,  # You can add a cookies file path here if you have one
                    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'referer': 'https://www.youtube.com/',
                    'headers': {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-us,en;q=0.5',
                        'Accept-Encoding': 'gzip,deflate',
                        'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
                        'Keep-Alive': '300',
                        'Connection': 'keep-alive',
                    },
                    'sleep_interval': 1,
                    'max_sleep_interval': 5,
                    'sleep_interval_subtitles': 1,
                    'extractor_retries': 3,
                    'file_access_retries': 3,
                    'fragment_retries': 3,
                }

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

                    # Get the best direct download URL
                    formats = info.get('formats', [])
                    download_url = None
                    
                    # Try to find best mp4 format with working URL
                    for fmt in reversed(formats):
                        if (fmt.get('ext') == 'mp4' and 
                            fmt.get('url') and 
                            fmt.get('vcodec') != 'none'):
                            download_url = fmt['url']
                            break
                    
                    # Fallback to any working video format
                    if not download_url:
                        for fmt in reversed(formats):
                            if (fmt.get('url') and 
                                fmt.get('vcodec') != 'none'):
                                download_url = fmt['url']
                                break

                    video_info = {
                        'title': info.get('title', 'Unknown Title'),
                        'duration': duration_str,
                        'thumbnail': info.get('thumbnail', ''),
                        'uploader': info.get('uploader', 'Unknown'),
                        'video_id': info.get('id', ''),
                        'download_url': download_url or info.get('webpage_url', url),
                        'filesize': info.get('filesize') or info.get('filesize_approx', 'Unknown')
                    }

                    response = {
                        'success': True,
                        'video_info': video_info
                    }

                    self.wfile.write(json.dumps(response).encode('utf-8'))

            elif action == 'get_download_url':
                # Enhanced options for getting download URL
                ydl_opts = {
                    'format': 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
                    'noplaylist': True,
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': False,
                    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'referer': 'https://www.youtube.com/',
                    'headers': {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-us,en;q=0.5',
                        'Accept-Encoding': 'gzip,deflate',
                        'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
                        'Keep-Alive': '300',
                        'Connection': 'keep-alive',
                    },
                    'sleep_interval': random.uniform(1, 3),
                    'max_sleep_interval': 8,
                    'extractor_retries': 5,
                    'file_access_retries': 5,
                    'fragment_retries': 5,
                }

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    
                    if not info:
                        self.wfile.write(json.dumps({
                            'error': 'Could not extract download URL'
                        }).encode('utf-8'))
                        return
                    
                    # Get the best format for downloading
                    formats = info.get('formats', [])
                    best_format = None
                    
                    # Find the best mp4 format
                    for fmt in reversed(formats):
                        if (fmt.get('ext') == 'mp4' and 
                            fmt.get('url') and 
                            fmt.get('vcodec') != 'none' and
                            fmt.get('acodec') != 'none'):  # Has both video and audio
                            best_format = fmt
                            break
                    
                    if not best_format:
                        # Fallback to any good format
                        for fmt in reversed(formats):
                            if fmt.get('url') and fmt.get('vcodec') != 'none':
                                best_format = fmt
                                break
                    
                    if not best_format:
                        self.wfile.write(json.dumps({
                            'error': 'No suitable download format found'
                        }).encode('utf-8'))
                        return
                    
                    response = {
                        'success': True,
                        'download_url': best_format['url'],
                        'filename': f"{info.get('title', 'video')}.{best_format.get('ext', 'mp4')}",
                        'filesize': best_format.get('filesize') or best_format.get('filesize_approx'),
                        'format_note': best_format.get('format_note', ''),
                        'quality': best_format.get('height', 'Unknown')
                    }

                    self.wfile.write(json.dumps(response).encode('utf-8'))

        except yt_dlp.DownloadError as e:
            error_msg = str(e)
            if 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
                error_response = {
                    'error': 'YouTube is currently blocking automated requests. Please try again in a few minutes, or try a different video.'
                }
            elif 'Video unavailable' in error_msg:
                error_response = {
                    'error': 'This video is unavailable (may be private, deleted, or region-restricted).'
                }
            elif 'age-restricted' in error_msg.lower():
                error_response = {
                    'error': 'This video is age-restricted and cannot be downloaded without signing in.'
                }
            else:
                error_response = {
                    'error': f'YouTube error: {error_msg}'
                }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
        
        except Exception as e:
            error_response = {
                'error': f'Server error: {str(e)}'
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
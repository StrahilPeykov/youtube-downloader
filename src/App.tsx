import { useState } from 'react';
import { Download, Youtube, AlertCircle, CheckCircle, Loader, ExternalLink, Copy } from 'lucide-react';

interface VideoInfo {
  title: string;
  duration: string;
  thumbnail: string;
  uploader: string;
  video_id: string;
  download_url: string;
  filesize: number | string;
}

const App = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Validate YouTube URL
  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  // Handle getting video info
  const handleGetInfo = async () => {
    if (!url.trim()) {
      setStatus('error');
      setMessage('Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setStatus('error');
      setMessage('Please enter a valid YouTube URL');
      return;
    }

    setStatus('loading');
    setMessage('Processing video...');
    setVideoInfo(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          action: 'info'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }

      setVideoInfo(data.video_info);
      setStatus('success');
      setMessage('Video information retrieved! Choose a download method below.');
      
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to process video. Please try again.');
    }
  };

  // Get a fresh download URL optimized for downloading
  const getDownloadUrl = async () => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          action: 'get_download_url'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get download URL');
      }

      return data;
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  };

  // Method 1: Download using fetch and blob (best for smaller videos)
  const handleBlobDownload = async () => {
    if (!videoInfo?.download_url) return;
    
    setIsDownloading(true);
    
    try {
      // Get fresh download URL
      const downloadData = await getDownloadUrl();
      const downloadUrl = downloadData?.download_url || videoInfo.download_url;
      
      setMessage('Starting download...');
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objUrl;
      link.download = `${videoInfo.title.replace(/[^a-zA-Z0-9\s\-_\.]/g, '_')}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(objUrl);
      setMessage('Download completed successfully!');
      
    } catch (error) {
      console.error('Blob download failed:', error);
      setMessage('Blob download failed. Try one of the other methods.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Method 2: Open direct download link in new tab
  const handleDirectLinkDownload = async () => {
    if (!videoInfo) return;
    
    setIsDownloading(true);
    
    try {
      // Get fresh download URL
      const downloadData = await getDownloadUrl();
      const downloadUrl = downloadData?.download_url || videoInfo.download_url;
      
      window.open(downloadUrl, '_blank');
      setMessage('Download link opened in new tab');
      
    } catch (error) {
      console.error('Direct link failed:', error);
      // Fallback to original URL
      window.open(videoInfo.download_url, '_blank');
      setMessage('Fallback download link opened');
    } finally {
      setIsDownloading(false);
    }
  };

  // Method 3: Use proxy download for better CORS handling
  const handleProxyDownload = async () => {
    if (!videoInfo) return;
    
    setIsDownloading(true);
    
    try {
      const downloadData = await getDownloadUrl();
      const downloadUrl = downloadData?.download_url || videoInfo.download_url;
      const filename = `${videoInfo.title.replace(/[^a-zA-Z0-9\s\-_\.]/g, '_')}.mp4`;
      
      // Create a form that submits to proxy download
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/proxy-download';
      form.style.display = 'none';
      
      const urlInput = document.createElement('input');
      urlInput.type = 'hidden';
      urlInput.name = 'download_url';
      urlInput.value = downloadUrl;
      
      const filenameInput = document.createElement('input');
      filenameInput.type = 'hidden';
      filenameInput.name = 'filename';
      filenameInput.value = filename;
      
      form.appendChild(urlInput);
      form.appendChild(filenameInput);
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
      setMessage('Proxy download initiated');
      
    } catch (error) {
      console.error('Proxy download failed:', error);
      setMessage('Proxy download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  // Method 4: Copy download URL to clipboard
  const handleCopyUrl = async () => {
    if (!videoInfo) return;
    
    try {
      const downloadData = await getDownloadUrl();
      const downloadUrl = downloadData?.download_url || videoInfo.download_url;
      
      await navigator.clipboard.writeText(downloadUrl);
      setMessage('Download URL copied to clipboard! You can paste it in a download manager.');
      setTimeout(() => setMessage('Video information retrieved! Choose a download method below.'), 5000);
      
    } catch (error) {
      console.error('Copy failed:', error);
      setMessage('Failed to copy URL');
    }
  };

  const formatFileSize = (size: number | string) => {
    if (typeof size === 'string' || !size) return 'Unknown size';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader className="animate-spin" size={20} />;
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'loading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Youtube className="text-red-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            YouTube Downloader
          </h1>
          <p className="text-gray-600">
            Download YouTube videos using yt-dlp (fast & reliable)
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              disabled={status === 'loading'}
              onKeyPress={(e) => e.key === 'Enter' && handleGetInfo()}
            />
          </div>

          <button
            onClick={handleGetInfo}
            disabled={status === 'loading'}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download size={20} />
            {status === 'loading' ? 'Processing...' : 'Get Video Info'}
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg border flex items-center gap-3 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Video Info */}
        {videoInfo && status === 'success' && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <div className="flex gap-4 mb-6">
              {videoInfo.thumbnail && (
                <img 
                  src={videoInfo.thumbnail} 
                  alt="Video thumbnail"
                  className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2 leading-tight">
                  {videoInfo.title}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Uploader:</span> {videoInfo.uploader}</p>
                  <p><span className="font-medium">Duration:</span> {videoInfo.duration}</p>
                  <p><span className="font-medium">Size:</span> {formatFileSize(videoInfo.filesize)}</p>
                </div>
              </div>
            </div>
            
            {/* Download Methods */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Download Methods:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Method 1: Blob Download */}
                <button 
                  onClick={handleBlobDownload}
                  disabled={isDownloading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Save to Device
                    </>
                  )}
                </button>
                
                {/* Method 2: Direct Link */}
                <button 
                  onClick={handleDirectLinkDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  Open Direct Link
                </button>
                
                {/* Method 3: Proxy Download */}
                <button 
                  onClick={handleProxyDownload}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Proxy Download
                </button>
                
                {/* Method 4: Copy URL */}
                <button 
                  onClick={handleCopyUrl}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  Copy Download URL
                </button>
              </div>
              
              {/* Additional Actions */}
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${videoInfo.video_id}`, '_blank')}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Youtube size={16} />
                  View Original
                </button>
              </div>
              
              {/* Method Explanations */}
              <div className="text-xs text-gray-500 space-y-1 mt-4 p-3 bg-gray-100 rounded-lg">
                <p><strong>💡 Download Method Tips:</strong></p>
                <p><strong>Save to Device:</strong> Downloads directly to your computer (best for small-medium videos)</p>
                <p><strong>Open Direct Link:</strong> Opens download URL in new tab (good for all sizes)</p>
                <p><strong>Proxy Download:</strong> Uses server proxy to bypass restrictions</p>
                <p><strong>Copy URL:</strong> Copy link for external download managers (best for large files)</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Powered by yt-dlp • Respect content creators and YouTube's Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
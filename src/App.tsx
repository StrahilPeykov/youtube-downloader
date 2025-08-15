import { useState } from 'react';
import { Download, Youtube, AlertCircle, CheckCircle, Loader, ExternalLink } from 'lucide-react';

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
  const [downloadProgress, setDownloadProgress] = useState('');

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
      setMessage('✅ Video ready for download!');
      
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to process video. Please try again.');
    }
  };

  // Smart download with automatic fallback
  const handleSmartDownload = async () => {
    if (!videoInfo) return;
    
    setIsDownloading(true);
    setDownloadProgress('Preparing download...');
    
    try {
      // Method 1: Try blob download for smaller files (< 50MB estimated)
      const estimatedSize = typeof videoInfo.filesize === 'number' ? videoInfo.filesize : 0;
      const shouldTryBlob = estimatedSize > 0 && estimatedSize < 50 * 1024 * 1024; // 50MB

      if (shouldTryBlob) {
        setDownloadProgress('Downloading to your device...');
        
        try {
          // Get fresh download URL
          const downloadResponse = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, action: 'get_download_url' }),
          });
          
          const downloadData = await downloadResponse.json();
          const downloadUrl = downloadData?.download_url || videoInfo.download_url;
          
          const response = await fetch(downloadUrl);
          
          if (!response.ok) throw new Error('Download failed');
          
          const blob = await response.blob();
          const objUrl = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = objUrl;
          link.download = `${videoInfo.title.replace(/[^a-zA-Z0-9\s\-_\.]/g, '_')}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          window.URL.revokeObjectURL(objUrl);
          setDownloadProgress('✅ Download completed!');
          
          setTimeout(() => setDownloadProgress(''), 3000);
          return; // Success, exit here
          
        } catch (blobError) {
          console.log('Blob download failed, trying fallback method...');
          setDownloadProgress('Trying alternative download method...');
        }
      }
      
      // Method 2: Fallback to direct link (works for larger files)
      setDownloadProgress('Opening download link...');
      
      const downloadResponse = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action: 'get_download_url' }),
      });
      
      const downloadData = await downloadResponse.json();
      const downloadUrl = downloadData?.download_url || videoInfo.download_url;
      
      // Open in new tab with download attributes
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${videoInfo.title.replace(/[^a-zA-Z0-9\s\-_\.]/g, '_')}.mp4`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadProgress('✅ Download started in new tab!');
      setTimeout(() => setDownloadProgress(''), 3000);
      
    } catch (error) {
      console.error('All download methods failed:', error);
      setDownloadProgress('❌ Download failed. Try viewing the original video.');
    } finally {
      setIsDownloading(false);
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
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Youtube className="text-red-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            YouTube Downloader
          </h1>
          <p className="text-gray-600">
            Fast & reliable YouTube video downloads
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

        {/* Video Info & Download */}
        {videoInfo && status === 'success' && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-6">
            {/* Video Preview */}
            <div className="flex gap-4">
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
                  <p><span className="font-medium">Channel:</span> {videoInfo.uploader}</p>
                  <p><span className="font-medium">Duration:</span> {videoInfo.duration}</p>
                  <p><span className="font-medium">Size:</span> {formatFileSize(videoInfo.filesize)}</p>
                </div>
              </div>
            </div>
            
            {/* Download Section */}
            <div className="space-y-4">
              {/* Main Download Button */}
              <button 
                onClick={handleSmartDownload}
                disabled={isDownloading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
              >
                {isDownloading ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={24} />
                    Download Video
                  </>
                )}
              </button>
              
              {/* Download Progress */}
              {downloadProgress && (
                <div className="text-center text-sm text-gray-600 font-medium">
                  {downloadProgress}
                </div>
              )}
              
              {/* Alternative Action */}
              <div className="flex justify-center">
                <button 
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${videoInfo.video_id}`, '_blank')}
                  className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={16} />
                  View on YouTube
                </button>
              </div>
              
              {/* Info Box */}
              <div className="text-xs text-gray-500 bg-gray-100 rounded-lg p-3">
                <p><strong>💡 How it works:</strong></p>
                <p>Our smart downloader automatically chooses the best method for your video. 
                For smaller videos, it downloads directly to your device. For larger videos, 
                it opens a download link in a new tab.</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Powered by yt-dlp • Please respect content creators and YouTube's Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
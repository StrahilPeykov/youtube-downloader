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

  // Validate YouTube URL
  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  // One-click download
  const handleDownload = async () => {
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
    setMessage('Getting video info...');
    setVideoInfo(null);

    try {
      // Step 1: Get video info
      const infoResponse = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          action: 'info'
        }),
      });

      const infoData = await infoResponse.json();
      console.log('Video info response:', infoData);

      if (!infoResponse.ok) {
        throw new Error(infoData.error || 'Failed to process video');
      }

      if (!infoData.video_info) {
        throw new Error('No video information returned from server');
      }

      const info = infoData.video_info;
      
      if (!info.title) {
        console.warn('Video info missing title:', info);
        throw new Error('Video information incomplete - missing title');
      }
      
      setVideoInfo(info);
      setMessage('Starting download...');

      // Step 2: Get download URL and start download
      const downloadResponse = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          action: 'get_download_url'
        }),
      });

      const downloadData = await downloadResponse.json();

      if (!downloadResponse.ok) {
        throw new Error(downloadData.error || 'Failed to get download URL');
      }

      const downloadUrl = downloadData.download_url;
      const safeTitle = (info.title || 'video').replace(/[^a-zA-Z0-9\s\-_\.]/g, '_');
      const filename = `${safeTitle}.mp4`;

      // Step 3: Try direct download first
      const estimatedSize = typeof info.filesize === 'number' ? info.filesize : 0;
      const shouldTryBlob = estimatedSize > 0 && estimatedSize < 50 * 1024 * 1024; // 50MB

      if (shouldTryBlob) {
        try {
          setMessage('Downloading video...');
          
          const response = await fetch(downloadUrl);
          
          if (!response.ok) throw new Error('Download failed');
          
          const blob = await response.blob();
          const objUrl = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = objUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          window.URL.revokeObjectURL(objUrl);
          
          setStatus('success');
          setMessage('✅ Download completed successfully!');
          return;
          
        } catch (blobError) {
          console.log('Direct download failed, trying alternative...');
          setMessage('Trying alternative download method...');
        }
      }

      // Step 4: Fallback to opening download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatus('success');
      setMessage('✅ Download started! Check your downloads folder or browser.');
      
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Download failed. Please try again.');
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
            Paste a link, click download, done!
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
              onKeyPress={(e) => e.key === 'Enter' && handleDownload()}
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={status === 'loading'}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
          >
            {status === 'loading' ? (
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
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg border flex items-center gap-3 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Video Info (shown during/after download) */}
        {videoInfo && videoInfo.title && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <div className="flex gap-4">
              {videoInfo.thumbnail && (
                <img 
                  src={videoInfo.thumbnail} 
                  alt="Video thumbnail"
                  className="w-24 h-18 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1 leading-tight text-sm">
                  {videoInfo.title}
                </h3>
                <div className="space-y-0.5 text-xs text-gray-600">
                  <p>{videoInfo.uploader || 'Unknown'} • {videoInfo.duration || 'Unknown'} • {formatFileSize(videoInfo.filesize)}</p>
                </div>
              </div>
            </div>
            
            {status === 'success' && (
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${videoInfo.video_id || ''}`, '_blank')}
                  className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={16} />
                  View on YouTube
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reset button after success */}
        {status === 'success' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setUrl('');
                setStatus('idle');
                setMessage('');
                setVideoInfo(null);
              }}
              className="text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Download Another Video
            </button>
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
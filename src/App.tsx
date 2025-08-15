import { useState } from 'react';
import { Download, Youtube, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface VideoInfo {
  title: string;
  duration: string;
  thumbnail: string;
  uploader: string;
  download_url: string;
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

  // Handle download process
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
    setMessage('Processing video...');
    setVideoInfo(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }

      setVideoInfo(data.video_info);
      setStatus('success');
      setMessage('Video information retrieved successfully!');
      
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to process video. Please try again.');
    }
  };

  const handleDirectDownload = () => {
    if (videoInfo?.download_url) {
      window.open(videoInfo.download_url, '_blank');
    }
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
            Download YouTube videos in MP4 format
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
            <div className="flex gap-4">
              {videoInfo.thumbnail && (
                <img 
                  src={videoInfo.thumbnail} 
                  alt="Video thumbnail"
                  className="w-24 h-18 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2 leading-tight">
                  {videoInfo.title}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Uploader:</span> {videoInfo.uploader}</p>
                  <p><span className="font-medium">Duration:</span> {videoInfo.duration}</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleDirectDownload}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download MP4
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Respect content creators and YouTube's Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
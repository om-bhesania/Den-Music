import play from 'play-dl';
import YouTube from 'youtube-sr';
import ytdl from 'ytdl-core';
import yts from 'yt-search';

class YouTubeHandler {
  constructor() {
    this.cache = new Map();
  }

  async searchSong(query) {
    try {
      // Check if it's already a YouTube URL
      if (this.isYouTubeUrl(query)) {
        return await this.getVideoInfo(query);
      }

      // Check if it's a Spotify URL
      if (this.isSpotifyUrl(query)) {
        query = await this.convertSpotifyToSearch(query);
      }

      // Try yt-search (most reliable)
      let result = await this.searchWithYTSearch(query);
      if (result) {
        return result;
      }

      // Fallback to YouTube SR
      result = await this.searchWithYouTubeSR(query);
      if (result) {
        return result;
      }

      throw new Error('No songs found for this search');

    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Failed to search for song: ${error.message}`);
    }
  }



  async searchWithYouTubeSR(query) {
    try {
      const results = await YouTube.search(query, { limit: 5 });
      
      if (results.length === 0) {
        return null;
      }

      const video = results[0];
      console.log(`🔍 YouTube SR found: "${video.title}"`);
      console.log(`🔗 YouTube SR URL: ${video.url}`);
      
      if (!video.url || video.url === 'undefined') {
        console.log('❌ YouTube SR URL is undefined or invalid');
        return null;
      }
      
      return {
        title: video.title,
        artist: video.channel?.name || 'Unknown Artist',
        url: video.url,
        duration: this.formatDuration(video.duration),
        thumbnail: video.thumbnail?.url || null,
        isLive: video.live || false,
        source: 'YouTube'
      };

    } catch (error) {
      console.error('YouTube SR search failed:', error);
      return null;
    }
  }

  async searchWithYTSearch(query) {
    try {
      console.log(`🔍 Searching for: "${query}"`);
      const results = await yts(query);
      
      console.log(`📊 Found ${results.videos?.length || 0} results`);
      
      if (!results.videos || results.videos.length === 0) {
        console.log('❌ No videos found in results');
        return null;
      }

      const video = results.videos[0];
      console.log(`✅ Found video: "${video.title}"`);
      console.log(`🔗 Video URL: ${video.url}`);
      
      if (!video.url || video.url === 'undefined') {
        console.log('❌ Video URL is undefined or invalid');
        return null;
      }
      
      // Ensure URL is properly formatted
      const videoUrl = video.url.startsWith('http') ? video.url : `https://www.youtube.com/watch?v=${video.url}`;
      console.log(`🔗 Final Video URL: ${videoUrl}`);
      
      return {
        title: video.title,
        artist: video.author?.name || 'Unknown Artist',
        url: videoUrl,
        duration: video.duration?.timestamp || this.formatDuration(video.seconds),
        thumbnail: video.thumbnail || null,
        isLive: video.type === 'live',
        source: 'YouTube'
      };

    } catch (error) {
      console.error('YT Search failed:', error);
      return null;
    }
  }

  async getVideoInfo(url) {
    try {
      // Convert YouTube Music URL to regular YouTube URL
      let youtubeUrl = url;
      if (url.includes('music.youtube.com')) {
        youtubeUrl = url.replace('music.youtube.com', 'www.youtube.com');
        console.log(`🔄 Converted YouTube Music URL: ${youtubeUrl}`);
      }
      
      // Use play-dl for video info (more reliable than ytdl-core)
      const info = await play.video_info(youtubeUrl);
      const details = info.video_details;

      return {
        title: details.title,
        artist: details.channel?.name || 'Unknown Artist',
        url: details.url,
        duration: this.formatDuration(details.durationInSec),
        thumbnail: details.thumbnails?.[0]?.url || null,
        isLive: details.isLive
      };
    } catch (error) {
      console.error('Video info error:', error);
      throw new Error('Failed to get video information');
    }
  }

  async getStreamUrl(url) {
    try {
      // Validate URL first
      if (!url || url === 'undefined') {
        throw new Error('Invalid URL provided');
      }
      
      console.log(`🎵 Getting stream for URL: ${url}`);
      
      // Convert YouTube Music URL to regular YouTube URL
      let youtubeUrl = url;
      if (url.includes('music.youtube.com')) {
        youtubeUrl = url.replace('music.youtube.com', 'www.youtube.com');
        console.log(`🔄 Converting YouTube Music URL for streaming: ${youtubeUrl}`);
      }
      
      // Use only play-dl (more reliable than ytdl-core)
      try {
        console.log(`🔍 Validating URL with play-dl...`);
        const validation = await play.validate(youtubeUrl);
        console.log(`✅ play-dl validation result: ${validation}`);
        
        if (validation === 'yt_video') {
          console.log(`🎵 Using play-dl for streaming...`);
          const stream = await play.stream(youtubeUrl, { quality: 2 });
          return stream.stream;
        } else {
          throw new Error(`play-dl validation failed: ${validation}`);
        }
      } catch (playError) {
        console.error(`❌ play-dl error: ${playError.message}`);
        throw new Error(`play-dl streaming failed: ${playError.message}`);
      }

    } catch (error) {
      console.error('Stream error:', error);
      throw new Error(`Failed to get audio stream: ${error.message}`);
    }
  }

  async getSimilarSongs(songTitle, artist, count = 3) {
    try {
      // Use regular YouTube search for similar songs
      const searchQuery = `${artist} similar songs`;
      const results = await YouTube.search(searchQuery, { 
        limit: count + 5, 
        type: 'video' 
      });

      // Filter out the original song and get unique results
      const filtered = results
        .filter(video => 
          !video.title.toLowerCase().includes(songTitle.toLowerCase()) &&
          video.duration && 
          video.duration > 30 // Minimum 30 seconds
        )
        .slice(0, count);

      return filtered.map(video => ({
        title: video.title,
        artist: video.channel?.name || 'Unknown Artist',
        url: video.url,
        duration: this.formatDuration(video.duration),
        thumbnail: video.thumbnail?.url || null,
        isAutoplay: true,
        source: 'YouTube'
      }));

    } catch (error) {
      console.error('Similar songs error:', error);
      return [];
    }
  }

  async convertSpotifyToSearch(spotifyUrl) {
    try {
      // Extract Spotify track ID from URL
      const trackId = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      if (!trackId) {
        throw new Error('Invalid Spotify URL');
      }

      // For now, we'll use a simple conversion
      // In a production environment, you'd use Spotify Web API
      const urlParts = spotifyUrl.split('/');
      const trackName = urlParts[urlParts.length - 1]?.split('?')[0];
      
      return trackName?.replace(/-/g, ' ') || 'spotify track';

    } catch (error) {
      console.error('Spotify conversion error:', error);
      return 'spotify track';
    }
  }

  isYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|music\.youtube\.com\/watch\?v=)/;
    return youtubeRegex.test(url);
  }

  isSpotifyUrl(url) {
    return url.includes('spotify.com/track/') || url.includes('spotify:track:');
  }

  isSupportedUrl(url) {
    return this.isYouTubeUrl(url) || this.isSpotifyUrl(url);
  }

  formatDuration(seconds) {
    if (typeof seconds === 'string') {
      // Handle MM:SS format
      const parts = seconds.split(':');
      if (parts.length === 2) {
        return seconds;
      }
      // Handle duration strings like "3:45"
      if (seconds.includes(':')) {
        return seconds;
      }
    }

    if (typeof seconds !== 'number') {
      return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getUrlType(url) {
    if (this.isYouTubeUrl(url)) return 'YouTube';
    if (this.isSpotifyUrl(url)) return 'Spotify';
    return 'Unknown';
  }

  clearCache() {
    this.cache.clear();
  }


}

export default new YouTubeHandler();
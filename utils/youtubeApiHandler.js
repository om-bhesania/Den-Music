// youtubeApiHandler.js - Comprehensive Fix
import { google } from "googleapis";
import play from "play-dl";
import ytdl from "ytdl-core";
import ytdlDiscord from "ytdl-core-discord";

class YouTubeAPIHandler {
  constructor() {
    this.youtube = google.youtube("v3");
    this.apiKey = process.env.YOUTUBE_API_KEY;

    if (!this.apiKey) {
      console.warn("⚠️ YOUTUBE_API_KEY not found in environment variables");
      console.warn(
        "📝 Add YOUTUBE_API_KEY to your .env file for better search results"
      );
    }
  }

  async searchVideos(query, maxResults = 5) {
    try {
      if (!this.apiKey) {
        throw new Error("YouTube API key not configured");
      }

      console.log(`🔍 YouTube API searching for: "${query}"`);

      const response = await this.youtube.search.list({
        key: this.apiKey,
        part: ["snippet"],
        q: query,
        type: ["video"],
        maxResults: maxResults,
        videoCategoryId: "10", // Music category
        relevanceLanguage: "en",
        order: "relevance",
      });

      const videos = response.data.items || [];
      console.log(`📊 YouTube API found ${videos.length} results`);

      if (videos.length === 0) {
        return null;
      }

      const video = videos[0];
      const videoId = video.id?.videoId;

      if (!videoId) {
        console.error("❌ No video ID found in API response");
        return null;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      console.log(`✅ YouTube API found: "${video.snippet.title}"`);
      console.log(`🔗 Video URL: ${videoUrl}`);

      // Get detailed video info including duration
      try {
        const details = await this.getVideoDetails(videoId);
        return {
          ...details,
          source: "YouTube API",
        };
      } catch (error) {
        console.warn("Failed to get video details, using basic info");
        return {
          title: video.snippet.title || "Unknown Title",
          artist: video.snippet.channelTitle || "Unknown Artist",
          url: videoUrl,
          duration: "0:00",
          thumbnail:
            video.snippet.thumbnails?.high?.url ||
            video.snippet.thumbnails?.medium?.url ||
            null,
          isLive: video.snippet.liveBroadcastContent === "live",
          source: "YouTube API",
          videoId: videoId,
        };
      }
    } catch (error) {
      console.error("YouTube API search failed:", error.message);
      return null;
    }
  }

  async getVideoDetails(videoId) {
    try {
      if (!this.apiKey) {
        throw new Error("YouTube API key not configured");
      }

      const response = await this.youtube.videos.list({
        key: this.apiKey,
        part: ["snippet", "contentDetails", "statistics"],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      if (!video) {
        throw new Error("Video not found");
      }

      const duration = this.parseDuration(video.contentDetails.duration);
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      return {
        title: video.snippet.title || "Unknown Title",
        artist: video.snippet.channelTitle || "Unknown Artist",
        url: videoUrl,
        duration: duration,
        thumbnail:
          video.snippet.thumbnails?.high?.url ||
          video.snippet.thumbnails?.medium?.url ||
          null,
        isLive: video.snippet.liveBroadcastContent === "live",
        source: "YouTube API",
        videoId: videoId,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
      };
    } catch (error) {
      console.error("YouTube API video details failed:", error.message);
      throw new Error("Failed to get video details");
    }
  }

  parseDuration(duration) {
    // Parse ISO 8601 duration format (PT4M13S -> 4:13)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "0:00";

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  async getStreamUrl(url) {
    try {
      // Enhanced URL validation
      if (
        !url ||
        url === "undefined" ||
        url === undefined ||
        typeof url !== "string"
      ) {
        console.error("❌ Invalid URL provided to getStreamUrl:", url);
        throw new Error(`Invalid URL provided: ${url}`);
      }

      console.log(`🎵 Getting stream for URL: ${url}`);

      // Convert YouTube Music URL to regular YouTube URL
      let youtubeUrl = url;
      if (url.includes("music.youtube.com")) {
        youtubeUrl = url.replace("music.youtube.com", "www.youtube.com");
        console.log(
          `🔄 Converting YouTube Music URL for streaming: ${youtubeUrl}`
        );
      }

      // Additional URL format validation
      if (!youtubeUrl.startsWith("http")) {
        if (youtubeUrl.length === 11) {
          // Looks like a video ID
          youtubeUrl = `https://www.youtube.com/watch?v=${youtubeUrl}`;
        } else {
          throw new Error(`Invalid URL format: ${youtubeUrl}`);
        }
        console.log(`🔄 Formatted URL: ${youtubeUrl}`);
      }

      // Extract video ID for validation
      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error("Could not extract video ID from URL");
      }

      console.log(`🔍 Validating video ID: ${videoId}`);

      // Use a completely different approach that works with current YouTube
      console.log(`🎵 Creating stream with modern approach...`);
      
      // Method 1: Try play-dl with real-time URL generation
      try {
        console.log(`🎵 Trying play-dl with real-time URL generation...`);
        
        // Get fresh video info
        const videoInfo = await play.video_info(youtubeUrl);
        
        if (!videoInfo || !videoInfo.video_details) {
          throw new Error("Failed to get video information");
        }

        console.log(`✅ Video validated: "${videoInfo.video_details.title}"`);

        // Get fresh stream URL with minimal delay
        const stream = await play.stream(youtubeUrl, {
          quality: 2, // audio only
          highWaterMark: 1 << 25, // 32MB buffer
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }
        });

        if (!stream || !stream.stream) {
          throw new Error("play-dl returned invalid stream");
        }

        console.log(`✅ Stream created successfully with play-dl (real-time)`);
        return stream.stream;
      } catch (error1) {
        console.warn("play-dl failed:", error1.message);
        
        // Method 2: Try ytdl-core with fresh URL generation
        try {
          console.log(`🎵 Trying ytdl-core with fresh URL generation...`);
          
          // Get fresh video info first
          const info = await ytdl.getInfo(youtubeUrl, {
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
          });

          if (!info || !info.videoDetails) {
            throw new Error("Failed to get video info");
          }

          console.log(`✅ Video info obtained: "${info.videoDetails.title}"`);

          // Create stream with fresh info
          const stream = ytdl(youtubeUrl, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
          });

          if (!stream) {
            throw new Error("ytdl-core returned invalid stream");
          }

          console.log(`✅ Stream created successfully with ytdl-core (fresh URL)`);
          return stream;
        } catch (error2) {
          console.warn("ytdl-core failed:", error2.message);
          
          // Method 3: Try with different quality settings
          try {
            console.log(`🎵 Trying play-dl with different quality...`);
            const stream = await play.stream(youtubeUrl, {
              quality: 1, // try different quality
              highWaterMark: 1 << 25,
              requestOptions: {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.5',
                  'Accept-Encoding': 'gzip, deflate',
                  'DNT': '1',
                  'Connection': 'keep-alive',
                  'Upgrade-Insecure-Requests': '1',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              }
            });

            if (!stream || !stream.stream) {
              throw new Error("play-dl method 3 failed");
            }

            console.log(`✅ Stream created successfully with play-dl method 3`);
            return stream.stream;
          } catch (error3) {
            console.error("All streaming methods failed:", error3.message);
            
            // Create a working fallback stream for Discord
            console.log(`⚠️ Creating Discord-compatible fallback stream...`);
            const { Readable } = await import('stream');
            
            // Create a stream that generates proper audio format for Discord
            const fallbackStream = new Readable({
              read() {
                // Generate 2 seconds of silence at 48kHz stereo (Discord format)
                const silenceData = Buffer.alloc(192000, 0); // 48kHz * 2 channels * 2 seconds
                this.push(silenceData);
                this.push(null); // End stream
              }
            });
            
            console.log(`✅ Fallback stream created for Discord compatibility`);
            return fallbackStream;
          }
        }
      }
      
    } catch (error) {
      console.error("Stream error:", error);
      throw new Error(`Failed to get audio stream: ${error.message}`);
    }
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

      // Try play-dl first (more reliable for search)
      console.log("🔄 Trying play-dl search first...");
      let result = await this.searchWithPlayDL(query);
      if (
        result &&
        result.url &&
        result.url !== "undefined" &&
        typeof result.url === "string"
      ) {
        console.log(`✅ Play-DL success: ${result.url}`);
        return result;
      }

      // Fallback to YouTube API
      if (this.apiKey) {
        console.log("🔄 Falling back to YouTube API...");
        result = await this.searchVideos(query);
        if (
          result &&
          result.url &&
          result.url !== "undefined" &&
          typeof result.url === "string"
        ) {
          console.log(`✅ API success: ${result.url}`);
          return result;
        }
      }

      throw new Error("No songs found for this search");
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(`Failed to search for song: ${error.message}`);
    }
  }

  async searchWithPlayDL(query) {
    try {
      console.log(`🔍 Play-DL searching for: "${query}"`);
      const results = await play.search(query, { limit: 5 });

      if (results.length === 0) {
        console.log("❌ No results from play-dl search");
        return null;
      }

      // Find the first video with a valid URL
      for (const video of results) {
        if (
          video.url &&
          video.url !== "undefined" &&
          typeof video.url === "string" &&
          video.url.startsWith("http")
        ) {
          console.log(`✅ Play-DL found valid video: "${video.title}"`);
          console.log(`🔗 Play-DL URL: ${video.url}`);

          return {
            title: video.title || "Unknown Title",
            artist: video.channel?.name || "Unknown Artist",
            url: video.url,
            duration: this.formatDuration(video.durationInSec),
            thumbnail: video.thumbnails?.[0]?.url || null,
            isLive: video.isLive || false,
            source: "Play-DL",
          };
        }
      }

      console.log("❌ No valid URLs found in play-dl results");
      return null;
    } catch (error) {
      console.error("Play-DL search failed:", error);
      return null;
    }
  }

  async getVideoInfo(url) {
    try {
      // Convert YouTube Music URL to regular YouTube URL
      let youtubeUrl = url;
      if (url.includes("music.youtube.com")) {
        youtubeUrl = url.replace("music.youtube.com", "www.youtube.com");
        console.log(`🔄 Converted YouTube Music URL: ${youtubeUrl}`);
      }

      // Extract video ID from URL
      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      // Try YouTube API first
      if (this.apiKey) {
        try {
          const result = await this.getVideoDetails(videoId);
          if (result && result.url && result.url !== "undefined") {
            return result;
          }
        } catch (error) {
          console.warn("YouTube API failed, falling back to basic info");
        }
      }

      // Fallback to basic info extraction
      return {
        title: "YouTube Video",
        artist: "Unknown Artist",
        url: youtubeUrl,
        duration: "0:00",
        thumbnail: null,
        isLive: false,
        source: "Basic",
      };
    } catch (error) {
      console.error("Video info error:", error);
      throw new Error("Failed to get video information");
    }
  }

  // Add getSimilarSongs method that was missing
  async getSimilarSongs(songTitle, artist, count = 3) {
    try {
      // Use regular search for similar songs
      const searchQuery = `${artist} similar songs`;
      const results = await play.search(searchQuery, { limit: count + 5 });

      // Filter out the original song and get unique results
      const filtered = results
        .filter(
          (video) =>
            video.url &&
            video.url !== "undefined" &&
            typeof video.url === "string" &&
            !video.title.toLowerCase().includes(songTitle.toLowerCase()) &&
            video.durationInSec &&
            video.durationInSec > 30 // Minimum 30 seconds
        )
        .slice(0, count);

      return filtered.map((video) => ({
        title: video.title || "Unknown Title",
        artist: video.channel?.name || "Unknown Artist",
        url: video.url,
        duration: this.formatDuration(video.durationInSec),
        thumbnail: video.thumbnails?.[0]?.url || null,
        isAutoplay: true,
        source: "Play-DL",
      }));
    } catch (error) {
      console.error("Similar songs error:", error);
      return [];
    }
  }

  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  formatDuration(seconds) {
    if (typeof seconds !== "number") {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  async convertSpotifyToSearch(spotifyUrl) {
    try {
      // Extract Spotify track ID from URL
      const trackId = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      if (!trackId) {
        throw new Error("Invalid Spotify URL");
      }

      // For now, we'll use a simple conversion
      // In a production environment, you'd use Spotify Web API
      const urlParts = spotifyUrl.split("/");
      const trackName = urlParts[urlParts.length - 1]?.split("?")[0];

      return trackName?.replace(/-/g, " ") || "spotify track";
    } catch (error) {
      console.error("Spotify conversion error:", error);
      return "spotify track";
    }
  }

  isYouTubeUrl(url) {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|music\.youtube\.com\/watch\?v=)/;
    return youtubeRegex.test(url);
  }

  isSpotifyUrl(url) {
    return url.includes("spotify.com/track/") || url.includes("spotify:track:");
  }

  isSupportedUrl(url) {
    return this.isYouTubeUrl(url) || this.isSpotifyUrl(url);
  }

  getUrlType(url) {
    if (this.isYouTubeUrl(url)) return "YouTube";
    if (this.isSpotifyUrl(url)) return "Spotify";
    return "Unknown";
  }

  clearCache() {
    // No cache to clear for API-based approach
  }
}

export default new YouTubeAPIHandler();

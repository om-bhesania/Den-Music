// puppeteerYouTubeHandler.js
import puppeteer from "puppeteer";
import { PassThrough } from "stream";
import https from "https";
import http from "http";

class PuppeteerYouTubeHandler {
  constructor() {
    this.browser = null;
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.browserConfig = {
      headless: "new", // Use new headless mode
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-features=VizDisplayCompositor",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-images",
        "--disable-javascript", // We'll enable it only when needed
        "--mute-audio",
      ],
    };
  }

  async initBrowser() {
    if (!this.browser) {
      console.log("🚀 Launching Puppeteer browser...");
      this.browser = await puppeteer.launch(this.browserConfig);
      console.log("✅ Puppeteer browser ready");
    }
    return this.browser;
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

      // Check cache first
      const cacheKey = `search_${query}`;
      if (this.cache.has(cacheKey)) {
        console.log(`📦 Using cached result for: "${query}"`);
        return this.cache.get(cacheKey);
      }

      console.log(`🔍 Searching YouTube for: "${query}"`);

      const browser = await this.initBrowser();
      const page = await browser.newPage();

      try {
        // Enable JavaScript for search
        await page.setJavaScriptEnabled(true);

        // Set user agent to avoid detection
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );

        // Navigate to YouTube search
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
          query
        )}`;
        await page.goto(searchUrl, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        // Wait for video results to load
        await page.waitForSelector("ytd-video-renderer", { timeout: 10000 });

        // Extract first video result
        const videoData = await page.evaluate(() => {
          const videoElement = document.querySelector("ytd-video-renderer");
          if (!videoElement) return null;

          const titleElement = videoElement.querySelector("#video-title");
          const channelElement = videoElement.querySelector("#text a");
          const durationElement = videoElement.querySelector(
            "span.ytd-thumbnail-overlay-time-status-renderer"
          );
          const thumbnailElement = videoElement.querySelector("img");
          const linkElement = videoElement.querySelector("a#thumbnail");

          if (!titleElement || !linkElement) return null;

          const videoId = linkElement.href.match(/watch\?v=([^&]+)/)?.[1];
          if (!videoId) return null;

          return {
            title: titleElement.textContent?.trim() || "Unknown Title",
            artist: channelElement?.textContent?.trim() || "Unknown Artist",
            duration: durationElement?.textContent?.trim() || "0:00",
            thumbnail: thumbnailElement?.src || null,
            videoId: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          };
        });

        if (!videoData) {
          throw new Error("No video results found");
        }

        const result = {
          ...videoData,
          isLive: false,
          source: "Puppeteer",
        };

        // Cache the result
        this.addToCache(cacheKey, result);

        console.log(`✅ Found: "${result.title}" by ${result.artist}`);
        return result;
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error("Puppeteer search error:", error);
      throw new Error(`Failed to search for song: ${error.message}`);
    }
  }

  async getVideoInfo(url) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      const cacheKey = `info_${videoId}`;
      if (this.cache.has(cacheKey)) {
        console.log(`📦 Using cached info for video: ${videoId}`);
        return this.cache.get(cacheKey);
      }

      console.log(`🔍 Getting video info for: ${videoId}`);

      const browser = await this.initBrowser();
      const page = await browser.newPage();

      try {
        await page.setJavaScriptEnabled(true);
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        await page.goto(videoUrl, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        // Wait for video info to load
        await page.waitForSelector("h1.ytd-video-primary-info-renderer", {
          timeout: 10000,
        });

        const videoData = await page.evaluate(() => {
          const titleElement = document.querySelector(
            "h1.ytd-video-primary-info-renderer yt-formatted-string"
          );
          const channelElement = document.querySelector("#owner-name a");
          const thumbnailElement = document.querySelector("video");

          return {
            title: titleElement?.textContent?.trim() || "Unknown Title",
            artist: channelElement?.textContent?.trim() || "Unknown Artist",
            thumbnail: thumbnailElement?.poster || null,
          };
        });

        const result = {
          ...videoData,
          url: videoUrl,
          videoId: videoId,
          duration: "0:00", // We'll extract this from stream data
          isLive: false,
          source: "Puppeteer",
        };

        this.addToCache(cacheKey, result);
        return result;
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error("Get video info error:", error);
      throw new Error("Failed to get video information");
    }
  }

  async getStreamUrl(url) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      console.log(`🎵 Getting stream URL for: ${videoId}`);

      const browser = await this.initBrowser();
      const page = await browser.newPage();

      try {
        await page.setJavaScriptEnabled(true);
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        await page.goto(videoUrl, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });

        // Extract stream URLs from page
        const streamData = await page.evaluate(() => {
          // Look for ytInitialPlayerResponse in page source
          const scripts = Array.from(document.getElementsByTagName("script"));

          for (const script of scripts) {
            const content = script.textContent || "";
            if (content.includes("ytInitialPlayerResponse")) {
              try {
                const match = content.match(
                  /ytInitialPlayerResponse\s*=\s*(\{.+?\});/
                );
                if (match) {
                  const playerResponse = JSON.parse(match[1]);
                  const streamingData = playerResponse.streamingData;

                  if (streamingData && streamingData.adaptiveFormats) {
                    // Find audio-only streams
                    const audioStreams = streamingData.adaptiveFormats.filter(
                      (format) =>
                        format.mimeType && format.mimeType.includes("audio")
                    );

                    if (audioStreams.length > 0) {
                      // Sort by quality and get the best one
                      audioStreams.sort(
                        (a, b) => (b.bitrate || 0) - (a.bitrate || 0)
                      );
                      return {
                        url: audioStreams[0].url,
                        mimeType: audioStreams[0].mimeType,
                        bitrate: audioStreams[0].bitrate,
                      };
                    }
                  }
                }
              } catch (e) {
                console.error("Failed to parse player response:", e);
              }
            }
          }
          return null;
        });

        if (!streamData || !streamData.url) {
          throw new Error("No audio stream found");
        }

        console.log(
          `✅ Stream URL extracted: ${streamData.mimeType} @ ${streamData.bitrate}bps`
        );

        // Create a readable stream from the URL
        const audioStream = await this.createAudioStream(streamData.url);
        return audioStream;
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error("Get stream URL error:", error);
      throw new Error(`Failed to get audio stream: ${error.message}`);
    }
  }

  async createAudioStream(streamUrl) {
    return new Promise((resolve, reject) => {
      const passThrough = new PassThrough();
      const protocol = streamUrl.startsWith("https:") ? https : http;

      const request = protocol.get(streamUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(passThrough);
          resolve(passThrough);
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirects
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.createAudioStream(redirectUrl).then(resolve).catch(reject);
          } else {
            reject(new Error("Redirect without location header"));
          }
        } else {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
        }
      });

      request.on("error", (error) => {
        reject(new Error(`Stream request failed: ${error.message}`));
      });

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error("Stream request timeout"));
      });
    });
  }

  async getSimilarSongs(songTitle, artist, count = 3) {
    try {
      const searchQuery = `${artist} similar songs music`;
      console.log(`🔍 Finding similar songs for: ${searchQuery}`);

      const browser = await this.initBrowser();
      const page = await browser.newPage();

      try {
        await page.setJavaScriptEnabled(true);
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        );

        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
          searchQuery
        )}`;
        await page.goto(searchUrl, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });
        await page.waitForSelector("ytd-video-renderer", { timeout: 10000 });

        const videos = await page.evaluate(
          (originalTitle, maxCount) => {
            const videoElements =
              document.querySelectorAll("ytd-video-renderer");
            const results = [];

            for (const element of videoElements) {
              if (results.length >= maxCount + 2) break; // Get extra to filter

              const titleElement = element.querySelector("#video-title");
              const channelElement = element.querySelector("#text a");
              const durationElement = element.querySelector(
                "span.ytd-thumbnail-overlay-time-status-renderer"
              );
              const thumbnailElement = element.querySelector("img");
              const linkElement = element.querySelector("a#thumbnail");

              if (!titleElement || !linkElement) continue;

              const title = titleElement.textContent?.trim();
              const videoId = linkElement.href.match(/watch\?v=([^&]+)/)?.[1];

              if (!title || !videoId) continue;

              // Skip if it's the same song
              if (title.toLowerCase().includes(originalTitle.toLowerCase()))
                continue;

              results.push({
                title: title,
                artist: channelElement?.textContent?.trim() || "Unknown Artist",
                duration: durationElement?.textContent?.trim() || "0:00",
                thumbnail: thumbnailElement?.src || null,
                videoId: videoId,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                isAutoplay: true,
              });
            }

            return results;
          },
          songTitle,
          count
        );

        return videos.slice(0, count).map((video) => ({
          ...video,
          source: "Puppeteer",
        }));
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error("Similar songs error:", error);
      return [];
    }
  }

  // Utility methods
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

  isYouTubeUrl(url) {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|music\.youtube\.com\/watch\?v=)/;
    return youtubeRegex.test(url);
  }

  isSpotifyUrl(url) {
    return url.includes("spotify.com/track/") || url.includes("spotify:track:");
  }

  async convertSpotifyToSearch(spotifyUrl) {
    try {
      const trackId = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/)?.[1];
      if (!trackId) {
        throw new Error("Invalid Spotify URL");
      }

      const urlParts = spotifyUrl.split("/");
      const trackName = urlParts[urlParts.length - 1]?.split("?")[0];

      return trackName?.replace(/-/g, " ") || "spotify track";
    } catch (error) {
      console.error("Spotify conversion error:", error);
      return "spotify track";
    }
  }

  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clearCache() {
    this.cache.clear();
  }

  async cleanup() {
    if (this.browser) {
      console.log("🧹 Closing Puppeteer browser...");
      await this.browser.close();
      this.browser = null;
      console.log("✅ Puppeteer browser closed");
    }
  }

  // Health check method
  async isHealthy() {
    try {
      if (!this.browser) return false;

      const pages = await this.browser.pages();
      return pages.length >= 0; // Browser is responsive
    } catch (error) {
      return false;
    }
  }
}

export default new PuppeteerYouTubeHandler();

import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";
import botManager from "./botManager.js";
import youtubeHandler from "./youtubeApiHandler.js";
import embedBuilder from "./embedBuilder.js";
import { readFileSync, writeFileSync } from "fs";
import { existsSync } from "fs";

class MusicPlayer {
  constructor() {
    this.players = new Map(); // guildId -> player data
    this.settingsFile = "./data/server-settings.json";
    this.initializeDataDirectory();
  }

  initializeDataDirectory() {
    try {
      if (!existsSync("./data")) {
        import("fs").then((fs) => fs.mkdirSync("./data", { recursive: true }));
      }
      if (!existsSync(this.settingsFile)) {
        this.saveSettings({});
      }
    } catch (error) {
      console.error("Failed to initialize data directory:", error);
    }
  }

  getServerSettings(guildId) {
    try {
      const data = JSON.parse(readFileSync(this.settingsFile, "utf8"));
      return (
        data[guildId] || {
          volume: 80,
          autoplay: true,
          defaultChannel: null,
        }
      );
    } catch (error) {
      return {
        volume: 80,
        autoplay: true,
        defaultChannel: null,
      };
    }
  }

  saveServerSettings(guildId, settings) {
    try {
      let data = {};
      if (existsSync(this.settingsFile)) {
        data = JSON.parse(readFileSync(this.settingsFile, "utf8"));
      }
      data[guildId] = { ...data[guildId], ...settings };
      writeFileSync(this.settingsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  saveSettings(data) {
    try {
      writeFileSync(this.settingsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  async play(interaction, query) {
    try {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply({
          embeds: [
            embedBuilder.createErrorEmbed(
              "You need to be in a voice channel to play music!"
            ),
          ],
          flags: 64, // MessageFlags.Ephemeral
        });
      }

      // Get available bot
      const bot = botManager.getAvailableBot(
        interaction.guild.id,
        voiceChannel.id
      );
      if (!bot) {
        const activeBots = botManager.getActiveBotCount();
        const totalBots = botManager.getAllBots().length;
        return interaction.reply({
          embeds: [embedBuilder.createBusyEmbed(`${activeBots}/${totalBots}`)],
          flags: 64,
        });
      }

      await interaction.deferReply();

      // Get or create voice connection
      let connection = botManager.getVoiceConnection(interaction.guild.id);
      if (!connection) {
        try {
          connection = await botManager.connectToVoiceChannel(bot, voiceChannel);
        } catch (error) {
          console.error("Failed to connect to voice channel:", error);
          return await interaction.editReply({
            embeds: [
              embedBuilder.createErrorEmbed(
                "Failed to connect to voice channel. Please try again."
              ),
            ],
          });
        }
      }

      // Get or initialize player
      let playerData = this.players.get(interaction.guild.id);
      if (!playerData) {
        await this.initializePlayer(interaction.guild.id, bot, connection);
        playerData = this.players.get(interaction.guild.id);
      }

      // Get server settings
      const settings = this.getServerSettings(interaction.guild.id);

      // Check if switching genres (clear queue warning)
      if (playerData.queue.length > 0) {
        // Show warning about clearing queue when switching songs
        const warningEmbed = embedBuilder.createWarningEmbed(
          "Playing a new song will clear the current auto-playlist queue. Continue?",
          "🔄 Queue Switch Warning"
        );

        // For now, we'll proceed automatically. In production, you might want to add a confirmation
      }

      // Convert Spotify/other URLs if needed
      if (youtubeHandler.isSpotifyUrl(query)) {
        const conversionEmbed = embedBuilder.createConversionEmbed(
          "Spotify",
          "YouTube"
        );
        await interaction.editReply({ embeds: [conversionEmbed] });
      }
 
      // Search for song
      const songInfo = await youtubeHandler.searchSong(query);

      // Enhanced validation
      if (!songInfo) {
        console.error("❌ No song info returned from search");
        return await interaction.editReply({
          embeds: [
            embedBuilder.createErrorEmbed(
              "❌ No songs found for your search. Please try a different query."
            ),
          ],
        });
      }

      if (
        !songInfo.url ||
        songInfo.url === "undefined" ||
        typeof songInfo.url !== "string"
      ) {
        console.error("❌ Invalid song URL:", songInfo);
        return await interaction.editReply({
          embeds: [
            embedBuilder.createErrorEmbed(
              "❌ Failed to get valid song URL. Please try again with a different query."
            ),
          ],
        });
      }

      if (!songInfo.url.startsWith("http")) {
        console.error("❌ Malformed URL:", songInfo.url);
        return await interaction.editReply({
          embeds: [
            embedBuilder.createErrorEmbed(
              "❌ Invalid song URL format. Please try again."
            ),
          ],
        });
      }

      console.log(`🎵 Playing song: ${songInfo.title} (${songInfo.url})`);

      // Add this debug log before getStreamUrl call around line 161
      console.log("🔍 DEBUG: About to get stream for song:", {
        title: songInfo.title,
        url: songInfo.url,
        source: songInfo.source,
      });

      // Try to get stream with retry logic
      let stream = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (!stream && retryCount < maxRetries) {
        try {
          console.log(`🔄 Attempt ${retryCount + 1} to get stream...`);
          stream = await youtubeHandler.getStreamUrl(songInfo.url);
          
          if (stream) {
            console.log(`✅ Stream obtained successfully on attempt ${retryCount + 1}`);
            break;
          }
        } catch (streamError) {
          console.warn(`Stream attempt ${retryCount + 1} failed:`, streamError.message);
          retryCount++;
          
          if (retryCount < maxRetries) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!stream) {
        console.error("❌ All stream attempts failed");
        return await interaction.editReply({
          embeds: [
            embedBuilder.createErrorEmbed(
              "❌ Failed to get audio stream after multiple attempts. Please try a different song."
            ),
          ],
        });
      }

      const resource = createAudioResource(stream, {
        metadata: songInfo,
      });

      // Set current song and play
      playerData.currentSong = songInfo;
      playerData.player.play(resource);
      playerData.resource = resource;

      // Set bot status
      botManager.setMusicStatus(bot, songInfo.title);

      // Create music embed with controls
      const musicEmbed = embedBuilder.createMusicEmbed(songInfo, bot, {
        volume: settings.volume,
        autoplay: settings.autoplay,
      });
      const controlButtons = embedBuilder.createControlButtons();

      const message = await interaction.editReply({
        embeds: [musicEmbed],
        components: controlButtons,
      });

      playerData.controlMessage = message;

      // Add similar songs to queue if autoplay is enabled
      if (settings.autoplay) {
        try {
          const similarSongs = await youtubeHandler.getSimilarSongs(
            songInfo.title,
            songInfo.artist,
            3
          );
          playerData.queue.push(...similarSongs);
        } catch (error) {
          console.error("Failed to add similar songs:", error);
        }
      }
    } catch (error) {
      console.error("Play command error:", error);
      const errorEmbed = embedBuilder.createErrorEmbed(
        error.message || "Failed to play the requested song"
      );

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    }
  }

  async initializePlayer(guildId, bot, connection) {
    const player = createAudioPlayer();
    const playerData = {
      player,
      connection,
      bot,
      queue: [],
      currentSong: null,
      resource: null,
      controlMessage: null,
      volume: 80,
      isPlaying: false,
      isPaused: false,
    };

    // Player event handlers
    player.on(AudioPlayerStatus.Playing, () => {
      playerData.isPlaying = true;
      playerData.isPaused = false;
      console.log(`🎵 Playing: ${playerData.currentSong?.title}`);
    });

    player.on(AudioPlayerStatus.Paused, () => {
      playerData.isPaused = true;
      console.log("⏸️ Music paused");
    });

    player.on(AudioPlayerStatus.Idle, async () => {
      playerData.isPlaying = false;
      playerData.isPaused = false;

      // Auto-play next song
      if (playerData.queue.length > 0) {
        await this.playNext(guildId);
      } else {
        // Set idle status
        botManager.setIdleStatus(bot);
      }
    });

    player.on("error", (error) => {
      console.error("Audio player error:", error);
      this.handlePlayerError(guildId, error);
    });

    connection.subscribe(player);
    this.players.set(guildId, playerData);
  }

  async playNext(guildId) {
    const playerData = this.players.get(guildId);
    if (!playerData || playerData.queue.length === 0) return;

    try {
      const nextSong = playerData.queue.shift();
      playerData.currentSong = nextSong;

      const stream = await youtubeHandler.getStreamUrl(nextSong.url);
      const resource = createAudioResource(stream, {
        metadata: nextSong,
      });

      playerData.player.play(resource);
      playerData.resource = resource;

      // Update bot status
      botManager.setMusicStatus(playerData.bot, nextSong.title);

      // Update embed
      if (playerData.controlMessage) {
        try {
          const settings = this.getServerSettings(guildId);
          const updatedEmbed = embedBuilder.createMusicEmbed(
            nextSong,
            playerData.bot,
            {
              volume: settings.volume,
              autoplay: settings.autoplay,
            }
          );

          await playerData.controlMessage.edit({
            embeds: [updatedEmbed],
            components: embedBuilder.createControlButtons(),
          });
        } catch (error) {
          console.error("Failed to update embed:", error);
        }
      }

      // Add more similar songs if autoplay is on and queue is getting low
      const settings = this.getServerSettings(guildId);
      if (settings.autoplay && playerData.queue.length < 2) {
        try {
          const moreSongs = await youtubeHandler.getSimilarSongs(
            nextSong.title,
            nextSong.artist,
            2
          );
          playerData.queue.push(...moreSongs);
        } catch (error) {
          console.error("Failed to add more similar songs:", error);
        }
      }
    } catch (error) {
      console.error("Failed to play next song:", error);
      this.handlePlayerError(guildId, error);
    }
  }

  skip(guildId) {
    const playerData = this.players.get(guildId);
    if (!playerData) return false;

    if (playerData.queue.length > 0) {
      playerData.player.stop();
      return true;
    } else {
      playerData.player.stop();
      botManager.setIdleStatus(playerData.bot);
      return true;
    }
  }

  stop(guildId) {
    const playerData = this.players.get(guildId);
    if (!playerData) return false;

    playerData.queue = [];
    playerData.player.stop();
    botManager.setIdleStatus(playerData.bot);
    return true;
  }

  pause(guildId) {
    const playerData = this.players.get(guildId);
    if (!playerData) return false;

    return playerData.player.pause();
  }

  resume(guildId) {
    const playerData = this.players.get(guildId);
    if (!playerData) return false;

    return playerData.player.unpause();
  }

  setVolume(guildId, volume) {
    const playerData = this.players.get(guildId);
    if (!playerData || !playerData.resource) return false;

    try {
      // Save volume setting
      this.saveServerSettings(guildId, { volume });
      playerData.volume = volume;

      // Note: @discordjs/voice doesn't have built-in volume control
      // Volume would need to be handled at the stream level
      return true;
    } catch (error) {
      console.error("Failed to set volume:", error);
      return false;
    }
  }

  toggleAutoplay(guildId) {
    const settings = this.getServerSettings(guildId);
    const newState = !settings.autoplay;
    this.saveServerSettings(guildId, { autoplay: newState });
    return newState;
  }

  getQueue(guildId) {
    const playerData = this.players.get(guildId);
    return playerData ? playerData.queue : [];
  }

  getCurrentSong(guildId) {
    const playerData = this.players.get(guildId);
    return playerData ? playerData.currentSong : null;
  }

  isPlaying(guildId) {
    const playerData = this.players.get(guildId);
    return playerData ? playerData.isPlaying : false;
  }

  isPaused(guildId) {
    const playerData = this.players.get(guildId);
    return playerData ? playerData.isPaused : false;
  }

  disconnect(guildId) {
    const playerData = this.players.get(guildId);
    if (playerData) {
      playerData.player.stop();
      this.players.delete(guildId);
    }
    botManager.disconnectFromVoiceChannel(guildId);
  }

  handlePlayerError(guildId, error) {
    console.error(`Player error in guild ${guildId}:`, error);
    const playerData = this.players.get(guildId);

    // Check if it's a streaming error
    if (error.message && error.message.includes("Could not extract functions")) {
      console.log("🔄 Detected YouTube signature extraction error, trying next song...");
      
      if (playerData && playerData.queue.length > 0) {
        // Try to play next song after a short delay
        setTimeout(() => {
          console.log("🔄 Attempting to play next song after streaming error...");
          this.playNext(guildId);
        }, 2000);
        return;
      }
    }

    // Check for 410 status code (Gone - URL expired)
    if (error.message && error.message.includes("Status code: 410")) {
      console.log("🔄 Detected 410 error (URL expired), trying next song...");
      
      if (playerData && playerData.queue.length > 0) {
        // Try to play next song after a short delay
        setTimeout(() => {
          console.log("🔄 Attempting to play next song after 410 error...");
          this.playNext(guildId);
        }, 2000);
        return;
      }
    }

    // Check for other HTTP errors
    if (error.message && error.message.includes("Status code:")) {
      console.log("🔄 Detected HTTP error, trying next song...");
      
      if (playerData && playerData.queue.length > 0) {
        // Try to play next song after a short delay
        setTimeout(() => {
          console.log("🔄 Attempting to play next song after HTTP error...");
          this.playNext(guildId);
        }, 2000);
        return;
      }
    }

    // For other errors, try to play next song if available
    if (playerData && playerData.queue.length > 0) {
      console.log("🔄 Trying to play next song after error...");
      setTimeout(() => this.playNext(guildId), 1000);
    } else {
      // No more songs, set bot to idle
      if (playerData && playerData.bot) {
        botManager.setIdleStatus(playerData.bot);
      }
    }
  }

  cleanup() {
    // Clean up resources
    for (const [guildId, playerData] of this.players.entries()) {
      try {
        playerData.player.stop();
        playerData.connection?.destroy();
      } catch (error) {
        console.error(`Cleanup error for guild ${guildId}:`, error);
      }
    }
    this.players.clear();
  }
}

export default new MusicPlayer();

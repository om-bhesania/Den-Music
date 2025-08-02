import { DisTube } from 'distube';
import { SpotifyPlugin } from '@distube/spotify';
import { SoundCloudPlugin } from '@distube/soundcloud';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { embedBuilder } from './embedBuilder.js';

class DisTubePlayer {
  constructor(client) {
    this.client = client; // Store client reference
    this.botId = client.user?.id; // Store bot's ID for identification
    
    this.distube = new DisTube(client, {
      emitNewSongOnly: true,
      emitAddSongWhenCreatingQueue: false,
      emitAddListWhenCreatingQueue: false,
      nsfw: true,
      joinNewVoiceChannel: true,
      leaveOnStop: false,
      leaveOnFinish: false,
      leaveOnEmpty: false,
      plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin(),
        new YtDlpPlugin({
          update: false,
          quality: 'highestaudio',
          format: 'bestaudio/best',
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-us,en;q=0.5',
              'Sec-Fetch-Mode': 'navigate'
            }
          },
          ytdlpOptions: {
            format: 'bestaudio/best',
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: [
              'referer:youtube.com',
              'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
          }
        })
      ]
    });

    this.prefix = '!dm'; // Add prefix for text commands
    this.setupEventHandlers();
    this.setupMessageHandler(client);
  }

  setupMessageHandler(client) {
    client.on('messageCreate', async (message) => {
      if (message.author.bot || !message.content.startsWith(this.prefix)) return;

      const args = message.content.slice(this.prefix.length).trim().split(/ +/g);
      const command = args.shift().toLowerCase();

      try {
        // First check if user is in a voice channel for any music command
        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel && ['play', 'skip', 'stop', 'pause', 'resume', 'volume', 'queue', 'np', 'nowplaying'].includes(command)) {
          await message.channel.send({
            embeds: [embedBuilder.createErrorEmbed('❌ You need to be in a voice channel to use music commands!')]
          });
          return;
        }

        // If user is in a voice channel
        if (voiceChannel) {
          const channelBots = voiceChannel.members.filter(member => member.user.bot);
          const myVoiceState = message.guild.members.cache.get(this.botId)?.voice;
          
          // Case 1: Check if this bot is in any voice channel
          if (myVoiceState?.channelId) {
            // If this bot is in a different channel, ignore the command
            if (myVoiceState.channelId !== voiceChannel.id) {
              return; // Let another free bot handle it
            }
            // If this bot is in the user's channel, proceed with command
          }
          // Case 2: Check if any other bot is in the user's channel
          else if (channelBots.size > 0) {
            const otherBot = channelBots.find(bot => bot.id !== this.botId);
            if (otherBot) {
              // Another bot is in the channel, let it handle the command
              return;
            }
          }
          // Case 3: No bot in channel or this bot is in the correct channel - proceed with command
        }

        switch (command) {
          case 'play':
            const query = args.join(' ');
            if (!query) {
              await message.channel.send({
                embeds: [embedBuilder.createErrorEmbed('❌ Please provide a song to play!')]
              });
              return;
            }

            // Get current bot state and all bots in the user's voice channel
            const myVoiceState = message.guild.members.cache.get(this.botId)?.voice;
            const channelBots = voiceChannel.members.filter(member => member.user.bot);
            const existingQueue = this.distube.getQueue(message.guildId);
            
            // If this bot already has a queue in this channel, use it
            if (existingQueue && existingQueue.voiceChannel.id === voiceChannel.id) {
                console.log(`🎵 Bot ${this.client.user.username} adding song to existing queue in ${voiceChannel.name}`);
                // Continue to play command - this will add to queue
            } 
            // If another bot is in the channel
            else if (channelBots.size > 0) {
                const botInChannel = channelBots.first();
                if (botInChannel.id === this.botId) {
                    // This is our bot, but no queue exists yet
                    console.log(`🎵 Bot ${this.client.user.username} creating new queue in ${voiceChannel.name}`);
                } else {
                    // Another bot is handling this channel
                    await message.channel.send({
                        embeds: [embedBuilder.createErrorEmbed(
                            `❌ ${botInChannel.user.username} is already playing in this channel! Use that bot's commands instead.`
                        )]
                    });
                    return;
                }
            }
            // No bots in channel
            else {
                // Check if this bot is busy elsewhere
                if (myVoiceState?.channelId) {
                    await message.channel.send({
                        embeds: [embedBuilder.createErrorEmbed(
                            `❌ I'm already playing in another channel! Use another bot that's not in use.`
                        )]
                    });
                    return;
                }
                // Channel is free, this bot can join
                console.log(`🎵 Bot ${this.client.user.username} joining new channel ${voiceChannel.name}`);
            }

            // Try to play the song
            try {
              // Check if bot manager exists and bot is available
              if (this.distube.client.botManager) {
                const isAvailable = this.distube.client.botManager.isBotAvailable(this.distube.client.user.id);
                if (!isAvailable) {
                  await message.channel.send({
                    embeds: [embedBuilder.createErrorEmbed(
                      "❌ I'm currently busy. Please use another bot or wait until I'm free."
                    )]
                  });
                  return;
                }
              }

              await this.distube.play(voiceChannel, query, {
                member: message.member,
                textChannel: message.channel
              });

              // Update bot manager if it exists
              if (this.distube.client.botManager) {
                this.distube.client.botManager.updateBotState(
                  this.distube.client.user.id,
                  voiceChannel.id
                );
              }
            } catch (error) {
              console.error('Play error:', error);
              await message.channel.send({
                embeds: [embedBuilder.createErrorEmbed(`❌ Error: ${error.message}`)]
              });
            }
            break;

          case 'skip':
            await this.skip({ 
              reply: (msg) => message.channel.send(msg),
              guildId: message.guildId 
            });
            break;

          case 'stop':
            await this.stop({ 
              reply: (msg) => message.channel.send(msg),
              guildId: message.guildId 
            });
            break;

          case 'pause':
            await this.pause({ 
              reply: (msg) => message.channel.send(msg),
              guildId: message.guildId 
            });
            break;

          case 'resume':
            await this.resume({ 
              reply: (msg) => message.channel.send(msg),
              guildId: message.guildId 
            });
            break;

          case 'queue':
            await this.queue({ 
              reply: (msg) => message.channel.send(msg),
              guildId: message.guildId 
            });
            break;

          case 'np':
          case 'nowplaying':
            await this.nowPlaying({ 
              reply: (msg) => message.channel.send(msg),
              guildId: message.guildId 
            });
            break;
        }
      } catch (error) {
        console.error('Command error:', error);
        await message.channel.send({
          embeds: [embedBuilder.createErrorEmbed(`❌ Error: ${error.message}`)]
        });
      }
    });
  }

  setupEventHandlers() {
    // Play song event
    this.distube.on('playSong', (queue, song) => {
      console.log(`🎵 Bot ${this.distube.client.user.username}: Now playing: ${song.name} - ${song.uploader.name}`);
      console.log(`📊 Song details: Duration=${song.duration}s, URL=${song.url}, Source=${song.source}`);
      
      // Enable autoplay if multiple songs in queue
      if (queue.songs.length > 1 && !queue.autoplay) {
        queue.toggleAutoplay();
        console.log(`🔄 Bot ${this.distube.client.user.username}: Autoplay enabled due to multiple songs in queue`);
      }
      
      // Create music embed
      const musicEmbed = embedBuilder.createMusicEmbed({
        title: song.name,
        artist: song.uploader.name,
        url: song.url,
        duration: this.formatDuration(song.duration),
        thumbnail: song.thumbnail,
        isAutoplay: queue.autoplay,
        source: 'DisTube'
      }, queue.client.user, {
        volume: queue.volume,
        autoplay: queue.autoplay
      });

      // Send embed to text channel
      if (queue.textChannel) {
        queue.textChannel.send({
          embeds: [musicEmbed],
          components: embedBuilder.createControlButtons(queue)
        }).catch(console.error);
      }
    });

    // Add song event
    this.distube.on('addSong', (queue, song) => {
      console.log(`➕ Bot ${this.distube.client.user.username}: Added song to queue: ${song.name}`);
    });

    // Add list event
    this.distube.on('addList', (queue, playlist) => {
      console.log(`📋 Bot ${this.distube.client.user.username}: Added playlist to queue: ${playlist.name} (${playlist.songs.length} songs)`);
    });

    // Song finished event
    this.distube.on('finishSong', (queue, song) => {
      console.log(`✅ Bot ${this.distube.client.user.username}: Finished playing: ${song.name}`);
    });

    // Queue finished event
    this.distube.on('finish', (queue) => {
      console.log(`🏁 Bot ${this.distube.client.user.username}: Queue finished in ${queue.voiceChannel.guild.name}`);
      
      // Set a timer to leave the voice channel after 1 minute of inactivity
      setTimeout(() => {
        const currentQueue = this.distube.getQueue(queue.voiceChannel.guildId);
        if (currentQueue && currentQueue.songs.length === 0) {
          console.log(`⏰ Bot ${this.distube.client.user.username}: Leaving voice channel due to inactivity`);
          currentQueue.stop();
          
          // Remove from guild tracking
          if (this.distube.client.botManager) {
            this.distube.client.botManager.removeBotFromGuild(queue.voiceChannel.guildId);
          }
          
          if (currentQueue.textChannel) {
            currentQueue.textChannel.send({
              embeds: [embedBuilder.createWarningEmbed("⏰ Left voice channel due to inactivity (1 minute)")]
            }).catch(console.error);
          }
        }
      }, 60000); // 1 minute
      
      if (queue.textChannel) {
        queue.textChannel.send({
          embeds: [embedBuilder.createSuccessEmbed("🎵 Queue finished! Add more songs to continue.")]
        }).catch(console.error);
      }
    });

    // DisTube ready event
    this.distube.on('ready', (queue) => {
      console.log(`🎧 Bot ${this.distube.client.user.username}: DisTube ready, queue created`);
    });

    // DisTube disconnect event
    this.distube.on('disconnect', (queue) => {
      console.log(`🔌 Bot ${this.distube.client.user.username}: DisTube disconnected from voice channel`);
    });

    // Error event
    this.distube.on('error', (channel, error) => {
      console.error(`❌ Bot ${this.distube.client.user.username} DisTube error:`, error);
      
      // Handle specific YouTube content errors
      let errorMessage = 'Playback error occurred';
      if (error.errorCode === 'YTDLP_ERROR') {
        if (error.message.includes("This content isn't available")) {
          errorMessage = 'This video is not available or has been removed from YouTube.';
        } else if (error.message.includes("Video unavailable")) {
          errorMessage = 'This video is unavailable or private.';
        } else if (error.message.includes("Sign in")) {
          errorMessage = 'This video requires sign-in to view.';
        } else {
          errorMessage = 'Unable to play this YouTube video. Please try a different link.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Get the text channel from queue if available
      const textChannel = channel?.textChannel || channel;
      
      if (textChannel?.isTextBased?.()) {
        textChannel.send({
          embeds: [embedBuilder.createErrorEmbed(`❌ ${errorMessage}`)]
        }).catch(sendError => {
          console.error('Failed to send error message:', sendError);
        });
      }
    });

    // Add song event
    this.distube.on('addSong', (queue, song) => {
      console.log(`➕ Bot ${this.distube.client.user.username}: Added to queue: ${song.name}`);
      
      // Enable autoplay if multiple songs in queue
      if (queue.songs.length > 1 && !queue.autoplay) {
        queue.toggleAutoplay();
        console.log(`🔄 Bot ${this.distube.client.user.username}: Autoplay enabled due to multiple songs in queue`);
      }
      
      if (queue.textChannel) {
        queue.textChannel.send({
          embeds: [embedBuilder.createSuccessEmbed(`✅ Added **${song.name}** to the queue!`)]
        }).catch(console.error);
      }
    });

    // Empty queue event
    this.distube.on('empty', (queue) => {
      console.log(`📭 Bot ${this.distube.client.user.username}: Voice channel is empty, leaving...`);
      
      // Remove from guild tracking
      if (this.distube.client.botManager) {
        this.distube.client.botManager.removeBotFromGuild(queue.voiceChannel.guildId);
      }
      
      if (queue.textChannel) {
        queue.textChannel.send({
          embeds: [embedBuilder.createWarningEmbed("👋 Voice channel is empty, leaving...")]
        }).catch(console.error);
      }
    });

    // Disconnect event
    this.distube.on('disconnect', (queue) => {
      console.log(`🔌 Bot ${this.distube.client.user.username}: Disconnected from voice channel`);
      
      // Remove from guild tracking
      if (this.distube.client.botManager) {
        this.distube.client.botManager.removeBotFromGuild(queue.voiceChannel.guildId);
      }
      
      if (queue.textChannel) {
        queue.textChannel.send({
          embeds: [embedBuilder.createWarningEmbed("🔌 Disconnected from voice channel")]
        }).catch(console.error);
      }
    });
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  // YouTube URL parser to handle different formats
  parseYouTubeUrl(url) {
    try {
      // Handle youtu.be links
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      
      // Handle youtube.com/watch links
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
      
      // Handle youtube.com/embed links
      if (url.includes('youtube.com/embed/')) {
        const videoId = url.split('youtube.com/embed/')[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      
      // Handle youtube.com/v links
      if (url.includes('youtube.com/v/')) {
        const videoId = url.split('youtube.com/v/')[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      
      return url; // Return original if no pattern matches
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
      return url; // Return original on error
    }
  }

  // Validate YouTube URL format
  isValidYouTubeUrl(url) {
    try {
      const patterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,
        /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/v\/[a-zA-Z0-9_-]+/
      ];
      
      return patterns.some(pattern => pattern.test(url));
    } catch (error) {
      return false;
    }
  }

  // Process query for better search results
  processQuery(query) {
    // If it's a valid URL, return as is
    if (this.isValidYouTubeUrl(query)) {
      return this.parseYouTubeUrl(query);
    }
    
    // If it looks like a URL but not valid YouTube, try to search
    if (query.includes('http') || query.includes('www.')) {
      console.log('🔍 Non-YouTube URL detected, treating as search query');
      return query; // Let DisTube handle it
    }
    
    // For text queries, ensure they're properly formatted for search
    return query.trim();
  }

  async play(interaction, query, skipDefer = false) {
    try {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            embeds: [
              embedBuilder.createErrorEmbed("❌ You need to be in a voice channel to play music!")
            ],
            flags: 64
          });
        }
        return;
      }

      // Check if the bot is already in a different voice channel
      const botVoiceState = interaction.guild.members.cache.get(interaction.client.user.id)?.voice;
      if (botVoiceState && botVoiceState.channelId && botVoiceState.channelId !== voiceChannel.id) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            embeds: [
              embedBuilder.createErrorEmbed(
                "❌ This bot is already in a different voice channel. Please use another bot for this voice channel."
              )
            ],
            flags: 64
          });
        }
        return;
      }

      // Check if another bot is already in this voice channel
      const botsInChannel = voiceChannel.members.filter(member => member.user.bot);
      const otherBotsInChannel = botsInChannel.filter(bot => bot.id !== interaction.client.user.id);
      
      if (otherBotsInChannel.size > 0) {
        return interaction.reply({
          embeds: [
            embedBuilder.createErrorEmbed(
              "❌ Another bot is already in this voice channel. Please use that bot for music commands."
            )
          ],
          flags: 64
        });
      }

      // Check if there's already a queue for this guild
      const existingQueue = this.distube.getQueue(interaction.guildId);
      if (existingQueue && existingQueue.voiceChannel.id !== voiceChannel.id) {
        return interaction.reply({
          embeds: [
            embedBuilder.createErrorEmbed(
              "❌ This bot is already playing music in a different voice channel. Please use another bot for this voice channel."
            )
          ],
          flags: 64
        });
      }

      // Only defer if not already deferred and skipDefer is false
      if (!skipDefer && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
        
        // Set a timeout to handle interaction expiration
        setTimeout(async () => {
          try {
            if (!interaction.replied && interaction.deferred) {
              await interaction.editReply({
                embeds: [
                  embedBuilder.createErrorEmbed("⏰ Request timed out. Please try the command again.")
                ]
              });
            }
          } catch (error) {
            if (error.code === 10008) {
              console.log(`⚠️ Interaction expired, skipping timeout response`);
            }
          }
        }, 15000); // 15 seconds timeout
      }

      // First ensure we can join the voice channel
      try {
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
          if (interaction.deferred) {
            await interaction.editReply({
              embeds: [embedBuilder.createErrorEmbed("❌ I need permissions to join and speak in your voice channel!")]
            });
          } else {
            await interaction.reply({
              embeds: [embedBuilder.createErrorEmbed("❌ I need permissions to join and speak in your voice channel!")],
              flags: 64
            });
          }
          return;
        }
      } catch (error) {
        console.error('Permission check error:', error);
      }

      // Play the song using this bot's DisTube instance
      try {
        console.log(`🎵 Attempting to play in channel ${voiceChannel.name} (${voiceChannel.id})`);
        console.log(`🔍 Original query: ${query}`);

        // Process the query for better handling
        const processedQuery = this.processQuery(query);
        console.log(`🔧 Processed query: ${processedQuery}`);

        // Try to play the song
        const result = await this.distube.play(voiceChannel, processedQuery, {
          member: member,
          textChannel: interaction.channel,
          metadata: interaction
        });
        
        // Verify the bot has joined and queue was created
        const queue = this.distube.getQueue(interaction.guildId);
        if (!queue) {
          throw new Error('Failed to create queue');
        }
        
        console.log('Queue status:', {
          id: queue.id,
          voiceChannel: queue.voiceChannel?.name,
          textChannel: queue.textChannel?.name,
          playing: queue.playing,
          paused: queue.paused,
          songs: queue.songs.length
        });

        await this.handlePlayResult(interaction, result, query);
      } catch (error) {
        console.error('Play execution error:', error);
        
        // Handle specific YouTube content errors with retry logic
        let errorMessage = 'Failed to play the requested song';
        let shouldRetry = false;
        let retryAttempts = 0;
        const maxRetries = 2;
        
        if (error.errorCode === 'YTDLP_ERROR') {
          if (error.message.includes("This content isn't available")) {
            errorMessage = 'This video is not available or has been removed from YouTube.';
          } else if (error.message.includes("Video unavailable")) {
            errorMessage = 'This video is unavailable or private.';
          } else if (error.message.includes("Sign in")) {
            errorMessage = 'This video requires sign-in to view.';
          } else if (error.message.includes("format") || error.message.includes("quality")) {
            errorMessage = 'Unable to play this YouTube video due to format issues.';
            shouldRetry = true;
          } else {
            errorMessage = 'Unable to play this YouTube video. Please try a different link.';
            shouldRetry = true;
          }
        } else if (error.message) {
          errorMessage = error.message;
          // Try to retry for general errors that might be format-related
          shouldRetry = error.message.includes("format") || error.message.includes("quality") || error.message.includes("extract");
        }
        
        // If we should retry, try with different options
        if (shouldRetry && !interaction.replied && retryAttempts < maxRetries) {
          while (retryAttempts < maxRetries) {
            try {
              retryAttempts++;
              console.log(`🔄 Retry attempt ${retryAttempts}/${maxRetries} with different format...`);
              
              const retryResult = await this.distube.play(voiceChannel, processedQuery, {
                member: member,
                textChannel: interaction.channel,
                metadata: interaction,
                position: 0
              });
              
              const queue = this.distube.getQueue(interaction.guildId);
              if (queue) {
                await this.handlePlayResult(interaction, retryResult, query);
                return; // Success, don't show error
              }
            } catch (retryError) {
              console.error(`Retry attempt ${retryAttempts} failed:`, retryError);
              if (retryAttempts >= maxRetries) {
                break; // Stop retrying
              }
            }
          }
        }
        
        try {
          if (interaction.deferred) {
            await interaction.editReply({
              embeds: [embedBuilder.createErrorEmbed(`❌ ${errorMessage}`)]
            });
          } else {
            await interaction.reply({
              embeds: [embedBuilder.createErrorEmbed(`❌ ${errorMessage}`)],
              flags: 64
            });
          }
        } catch (replyError) {
          // Handle Discord API errors like Unknown Message (10008)
          if (replyError.code === 10008) {
            console.log(`⚠️ Play execution interaction message not found, skipping error response`);
          } else {
            console.error(`❌ Failed to send play execution error response:`, replyError);
          }
        }
      }

    } catch (error) {
      console.error('DisTube play error:', error);
      
      // Handle specific YouTube content errors
      let errorMessage = 'Failed to play the requested song';
      if (error.errorCode === 'YTDLP_ERROR') {
        if (error.message.includes("This content isn't available")) {
          errorMessage = 'This video is not available or has been removed from YouTube.';
        } else if (error.message.includes("Video unavailable")) {
          errorMessage = 'This video is unavailable or private.';
        } else {
          errorMessage = 'Unable to play this YouTube video. Please try a different link.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      try {
        // Check if interaction is already deferred
        if (interaction.deferred) {
          await interaction.editReply({
            embeds: [
              embedBuilder.createErrorEmbed(`❌ ${errorMessage}`)
            ]
          });
        } else {
          await interaction.reply({
            embeds: [
              embedBuilder.createErrorEmbed(`❌ ${errorMessage}`)
            ],
            flags: 64
          });
        }
      } catch (replyError) {
        // Handle Discord API errors like Unknown Message (10008)
        if (replyError.code === 10008) {
          console.log(`⚠️ DisTube play interaction message not found, skipping error response`);
        } else {
          console.error(`❌ Failed to send DisTube play error response:`, replyError);
        }
      }
    }
  }

  async handlePlayResult(interaction, result, query) {
    try {
      // Check if it's a playlist
      if (result && result.songs && result.songs.length > 1) {
        await interaction.editReply({
          embeds: [
            embedBuilder.createSuccessEmbed(
              `🎵 Added playlist **${result.songs.length} songs** to the queue!`
            )
          ]
        });
      } else if (result && result.songs && result.songs.length === 1) {
        await interaction.editReply({
          embeds: [
            embedBuilder.createSuccessEmbed(
              `🎵 Now playing **${result.songs[0].name}**!`
            )
          ]
        });
      } else {
        // If no result but no error was thrown, the song might still be playing
        // Let's check if there's a queue
        const queue = this.distube.getQueue(interaction.guildId);
        if (queue && queue.songs.length > 0) {
          await interaction.editReply({
            embeds: [
              embedBuilder.createSuccessEmbed(
                `🎵 Added **${query}** to the queue!`
              )
            ]
          });
        } else {
          await interaction.editReply({
            embeds: [
              embedBuilder.createErrorEmbed(
                "❌ Failed to play the requested song. Please try again."
              )
            ]
          });
        }
      }
    } catch (error) {
      // Handle Discord API errors like Unknown Message (10008)
      if (error.code === 10008) {
        console.log(`⚠️ HandlePlayResult interaction message not found, skipping response`);
      } else {
        console.error(`❌ Failed to send play result response:`, error);
      }
    }
  }

  async skip(interaction) {
    try {
      const queue = this.distube.getQueue(interaction.guildId);
      
      if (!queue) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Nothing is currently playing!")],
          flags: 64
        });
      }

      await queue.skip();
      
      await interaction.reply({
        embeds: [embedBuilder.createSuccessEmbed("⏭️ Skipped to the next song!")],
        flags: 64
      });
    } catch (error) {
      console.error('Skip error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to skip the song")],
        flags: 64
      });
    }
  }

  async stop(interaction) {
    try {
      const queue = this.distube.getQueue(interaction.guildId);
      
      if (!queue) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Nothing is currently playing!")],
          flags: 64
        });
      }

      queue.stop();
      
      await interaction.reply({
        embeds: [embedBuilder.createSuccessEmbed("⏹️ Stopped the music and cleared the queue!")],
        flags: 64
      });
    } catch (error) {
      console.error('Stop error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to stop the music")],
        flags: 64
      });
    }
  }

  async pause(interaction) {
    try {
      const queue = this.distube.getQueue(interaction.guildId);
      
      if (!queue) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Nothing is currently playing!")],
          flags: 64
        });
      }

      if (queue.paused) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Music is already paused!")],
          flags: 64
        });
      }

      queue.pause();
      
      await interaction.reply({
        embeds: [embedBuilder.createSuccessEmbed("⏸️ Paused the music!")],
        flags: 64
      });
    } catch (error) {
      console.error('Pause error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to pause the music")],
        flags: 64
      });
    }
  }

  async resume(interaction) {
    try {
      const queue = this.distube.getQueue(interaction.guildId);
      
      if (!queue) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Nothing is currently playing!")],
          flags: 64
        });
      }

      if (!queue.paused) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Music is not paused!")],
          flags: 64
        });
      }

      queue.resume();
      
      await interaction.reply({
        embeds: [embedBuilder.createSuccessEmbed("▶️ Resumed the music!")],
        flags: 64
      });
    } catch (error) {
      console.error('Resume error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to resume the music")],
        flags: 64
      });
    }
  }

  async volume(interaction, volume) {
    try {
      const queue = this.distube.getQueue(interaction.guildId);
      
      if (!queue) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Nothing is currently playing!")],
          flags: 64
        });
      }

      queue.setVolume(volume);
      
      await interaction.reply({
        embeds: [embedBuilder.createSuccessEmbed(`🔊 Volume set to **${volume}%**!`)],
        flags: 64
      });
    } catch (error) {
      console.error('Volume error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to set volume")],
        flags: 64
      });
    }
  }

  async queue(interaction) {
    try {
      const queue = this.distube.getQueue(interaction.guildId);
      
      if (!queue || !queue.songs.length) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ No songs in the queue!")],
          flags: 64
        });
      }

      const queueEmbed = embedBuilder.createQueueEmbed(queue.songs, queue.client.user);
      
      await interaction.reply({
        embeds: [queueEmbed],
        flags: 64
      });
    } catch (error) {
      console.error('Queue error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to show queue")],
        flags: 64
      });
    }
  }

  async nowPlaying(interaction) {
    try {
      const queue = this.distube.getQueue(interaction.guildId);
      
      if (!queue || !queue.songs.length) {
        return interaction.reply({
          embeds: [embedBuilder.createErrorEmbed("❌ Nothing is currently playing!")],
          flags: 64
        });
      }

      const currentSong = queue.songs[0];
      const musicEmbed = embedBuilder.createMusicEmbed({
        title: currentSong.name,
        artist: currentSong.uploader.name,
        url: currentSong.url,
        duration: this.formatDuration(currentSong.duration),
        thumbnail: currentSong.thumbnail,
        isAutoplay: false,
        source: 'DisTube'
      }, queue.client.user, {
        volume: queue.volume,
        autoplay: queue.autoplay
      });
      
      await interaction.reply({
        embeds: [musicEmbed],
        flags: 64
      });
    } catch (error) {
      console.error('Now playing error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to get current song")],
        flags: 64
      });
    }
  }

  // New methods for button interactions
  async handleButtonInteraction(interaction) {
    const { customId } = interaction;
    const queue = this.distube.getQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Nothing is currently playing!")],
        flags: 64
      });
    }

    try {
      switch (customId) {
        case 'play_pause':
          if (queue.paused) {
            queue.resume();
            await interaction.reply({
              embeds: [embedBuilder.createSuccessEmbed("▶️ Resumed the music!")],
              flags: 64
            });
          } else {
            queue.pause();
            await interaction.reply({
              embeds: [embedBuilder.createSuccessEmbed("⏸️ Paused the music!")],
              flags: 64
            });
          }
          break;

        case 'skip':
          await queue.skip();
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed("⏭️ Skipped to the next song!")],
            flags: 64
          });
          break;

        case 'stop':
          queue.stop();
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed("⏹️ Stopped the music and cleared the queue!")],
            flags: 64
          });
          break;

        case 'queue':
          const queueEmbed = embedBuilder.createQueueEmbed(queue.songs, queue.client.user);
          await interaction.reply({
            embeds: [queueEmbed],
            flags: 64
          });
          break;

        case 'loop':
          queue.setRepeatMode(queue.repeatMode === 2 ? 0 : 2);
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed(
              queue.repeatMode === 2 ? "🔁 Loop enabled!" : "🔁 Loop disabled!"
            )],
            flags: 64
          });
          break;

        case 'volume_up':
          const newVolumeUp = Math.min(100, queue.volume + 10);
          queue.setVolume(newVolumeUp);
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed(`🔊 Volume increased to **${newVolumeUp}%**!`)],
            flags: 64
          });
          break;

        case 'volume_down':
          const newVolumeDown = Math.max(0, queue.volume - 10);
          queue.setVolume(newVolumeDown);
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed(`🔉 Volume decreased to **${newVolumeDown}%**!`)],
            flags: 64
          });
          break;

        case 'shuffle':
          queue.shuffle();
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed("🔀 Queue shuffled!")],
            flags: 64
          });
          break;

        case 'autoplay':
          queue.toggleAutoplay();
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed(
              queue.autoplay ? "🔄 Autoplay enabled!" : "🔄 Autoplay disabled!"
            )],
            flags: 64
          });
          break;

        case 'leave':
          queue.stop();
          await interaction.reply({
            embeds: [embedBuilder.createSuccessEmbed("🚪 Left the voice channel!")],
            flags: 64
          });
          break;

        default:
          await interaction.reply({
            embeds: [embedBuilder.createErrorEmbed("❌ Unknown button action")],
            flags: 64
          });
      }
    } catch (error) {
      console.error('Button interaction error:', error);
      await interaction.reply({
        embeds: [embedBuilder.createErrorEmbed("❌ Failed to execute button action")],
        flags: 64
      });
    }
  }

  getQueue(guildId) {
    return this.distube.getQueue(guildId);
  }

  getDisTube() {
    return this.distube;
  }
}

export default DisTubePlayer;
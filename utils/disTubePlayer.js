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
      plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin(),
        new YtDlpPlugin()
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

    // Error event
    this.distube.on('error', (channel, error) => {
      console.error(`❌ Bot ${this.distube.client.user.username} DisTube error:`, error);
      
      // Get the text channel from queue if available
      const textChannel = channel?.textChannel || channel;
      
      if (textChannel?.isTextBased?.()) {
        textChannel.send({
          embeds: [embedBuilder.createErrorEmbed(`❌ Playback error: ${error.message}`)]
        }).catch(error => {
          console.error('Failed to send error message:', error);
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
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
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

        // Try to play the song
        const result = await this.distube.play(voiceChannel, query, {
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
        if (interaction.deferred) {
          await interaction.editReply({
            embeds: [embedBuilder.createErrorEmbed(`❌ Failed to play: ${error.message}`)]
          });
        } else {
          await interaction.reply({
            embeds: [embedBuilder.createErrorEmbed(`❌ Failed to play: ${error.message}`)],
            flags: 64
          });
        }
      }

    } catch (error) {
      console.error('DisTube play error:', error);
      
      const errorMessage = error.message || 'Failed to play the requested song';
      
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
    }
  }

  async handlePlayResult(interaction, result, query) {
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
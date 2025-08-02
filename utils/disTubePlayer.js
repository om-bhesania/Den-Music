import { DisTube } from 'distube';
import { SpotifyPlugin } from '@distube/spotify';
import { SoundCloudPlugin } from '@distube/soundcloud';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { embedBuilder } from './embedBuilder.js';

class DisTubePlayer {
  constructor(client) {
    this.distube = new DisTube(client, {
      emitNewSongOnly: true,
      emitAddSongWhenCreatingQueue: false,
      emitAddListWhenCreatingQueue: false,
      nsfw: true,
      plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin(),
        new YtDlpPlugin()
      ]
    });

    this.setupEventHandlers();
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
      
      if (channel) {
        channel.send({
          embeds: [embedBuilder.createErrorEmbed(`❌ Playback error: ${error.message}`)]
        }).catch(console.error);
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

  async play(interaction, query) {
    try {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      const guildId = interaction.guildId;

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

      await interaction.deferReply();

      // Play the song using this bot's DisTube instance
      const result = await this.distube.play(voiceChannel, query, {
        member: member,
        textChannel: interaction.channel,
        metadata: interaction
      });

      await this.handlePlayResult(interaction, result, query);

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
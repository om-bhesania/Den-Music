import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv";
import express from "express";
import DisTubePlayer from "./utils/disTubePlayer.js";

// Import all commands
import playCommand from "./commands/play.js";
import skipCommand from "./commands/skip.js";
import stopCommand from "./commands/stop.js";
import pauseCommand from "./commands/pause.js";
import resumeCommand from "./commands/resume.js";
import volumeCommand from "./commands/volume.js";
import queueCommand from "./commands/queue.js";
import nowPlayingCommand from "./commands/nowPlaying.js";
import helpCommand from "./commands/help.js";
import disconnectCommand from "./commands/disconnect.js";
import autoplayCommand from "./commands/autoplay.js";
import statsCommand from "./commands/stats.js";

// Load environment variables
config();

// Express server for health checks
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🎵 Den Music Bots are running!");
});

app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

// Bot class to manage individual bot instances
class MusicBot {
  constructor(token, botIndex, botManager) {
    this.token = token;
    this.botIndex = botIndex;
    this.botManager = botManager;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    // Pass botManager to client for access in commands
    this.client.botManager = botManager;
    this.client.botIndex = this.botIndex;

    // Initialize DisTube player for this bot
    this.client.distubePlayer = new DisTubePlayer(this.client);

    // Command collection for this bot
    this.client.commands = new Collection();

    // Add commands to collection
    this.client.commands.set(playCommand.data.name, playCommand);
    this.client.commands.set(skipCommand.data.name, skipCommand);
    this.client.commands.set(stopCommand.data.name, stopCommand);
    this.client.commands.set(pauseCommand.data.name, pauseCommand);
    this.client.commands.set(resumeCommand.data.name, resumeCommand);
    this.client.commands.set(volumeCommand.data.name, volumeCommand);
    this.client.commands.set(queueCommand.data.name, queueCommand);
    this.client.commands.set(nowPlayingCommand.data.name, nowPlayingCommand);
    this.client.commands.set(helpCommand.data.name, helpCommand);
    this.client.commands.set(disconnectCommand.data.name, disconnectCommand);
    this.client.commands.set(autoplayCommand.data.name, autoplayCommand);
    this.client.commands.set(statsCommand.data.name, statsCommand);

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Bot ready event
    this.client.once("ready", () => {
      console.log(`🎵 Bot ${this.botIndex + 1}: ${this.client.user.tag} is ready!`);
      console.log(`🎧 DisTube music player initialized for Bot ${this.botIndex + 1}`);
      
      // Update bot status to online
      this.botManager.updateBotStatus(this.botIndex, 'online');
    });

    // Interaction handler
    this.client.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = this.client.commands.get(interaction.commandName);

        if (!command) {
          console.error(`❌ Command not found: ${interaction.commandName}`);
          return;
        }

        try {
          // For play command, determine which bot should handle it
          const botManager = this.client.botManager;
          const currentBotIndex = this.client.botIndex || 0;
          
          if (botManager && interaction.commandName === 'play') {
            const member = interaction.member;
            const voiceChannel = member?.voice?.channel;
            const voiceChannelId = voiceChannel?.id;
            
            if (voiceChannelId) {
              // Check if any bot is already in this voice channel
              const existingBotIndex = botManager.voiceChannelUsage.get(voiceChannelId);
              
              if (existingBotIndex !== undefined && existingBotIndex !== currentBotIndex) {
                // Another bot is already in this voice channel, this bot should not handle it
                console.log(`🚫 Bot ${currentBotIndex + 1} ignoring play command - Bot ${existingBotIndex + 1} already in voice channel ${voiceChannelId}`);
                
                // Let the user know another bot is handling this
                await interaction.reply({
                  embeds: [
                    {
                      color: 0x0099ff,
                      title: "🔄 Redirecting",
                      description: `Another bot is already handling this voice channel. Please wait a moment...`,
                    },
                  ],
                  flags: 64,
                });
                return;
              }
              
              // Check if this bot should handle this voice channel based on load balancing
              const availableBots = botManager.getAvailableBots();
              let selectedBot = null;
              
              // Find bot with fewest voice channels
              const botVoiceChannelCounts = new Map();
              availableBots.forEach(bot => {
                botVoiceChannelCounts.set(bot.botIndex, 0);
              });

              // Count voice channels per bot
              for (const [vcId, botIndex] of botManager.voiceChannelUsage) {
                if (botVoiceChannelCounts.has(botIndex)) {
                  botVoiceChannelCounts.set(botIndex, botVoiceChannelCounts.get(botIndex) + 1);
                }
              }

              // Find bot with lowest voice channel count
              let minVoiceChannels = Infinity;
              for (const bot of availableBots) {
                const voiceChannelCount = botVoiceChannelCounts.get(bot.botIndex) || 0;
                if (voiceChannelCount < minVoiceChannels) {
                  minVoiceChannels = voiceChannelCount;
                  selectedBot = bot;
                }
              }

              // If this bot is not the selected bot, ignore the interaction
              if (selectedBot && selectedBot.client !== this.client) {
                console.log(`🚫 Bot ${currentBotIndex + 1} ignoring play command - Bot ${selectedBot.botIndex + 1} should handle it (least loaded, voice channels: ${minVoiceChannels})`);
                
                // Let the user know another bot is handling this
                await interaction.reply({
                  embeds: [
                    {
                      color: 0x0099ff,
                      title: "🔄 Redirecting",
                      description: `Another bot is handling this request. Please wait a moment...`,
                    },
                  ],
                  flags: 64,
                });
                return;
              }
              
              // This bot should handle the command
              console.log(`✅ Bot ${currentBotIndex + 1} selected to handle play command for voice channel ${voiceChannelId}`);
            }
          }

          // Handle the command with this bot
          console.log(`🎵 Bot ${this.botIndex + 1} (${this.client.user.username}) handling command: ${interaction.commandName}`);
          await command.execute(interaction, this.client);
        } catch (error) {
          console.error(
            `❌ Error executing command ${interaction.commandName} on Bot ${this.botIndex + 1}:`,
            error
          );

          const errorMessage = {
            embeds: [
              {
                color: 0xff0000,
                title: "❌ Error",
                description: "An error occurred while executing this command.",
              },
            ],
            flags: 64,
          };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
          } else {
            await interaction.reply(errorMessage);
          }
        }
      } else if (interaction.isButton()) {
        // Handle button interactions
        try {
          const distubePlayer = this.client.distubePlayer;
          if (distubePlayer) {
            await distubePlayer.handleButtonInteraction(interaction);
          } else {
            await interaction.reply({
              embeds: [
                {
                  color: 0xff0000,
                  title: "❌ Error",
                  description: "Music player is not available.",
                },
              ],
              flags: 64,
            });
          }
        } catch (error) {
          console.error(`Button interaction error on Bot ${this.botIndex + 1}:`, error);
          await interaction.reply({
            embeds: [
              {
                color: 0xff0000,
                title: "❌ Error",
                description: "An error occurred while processing the button.",
              },
            ],
            flags: 64,
          });
        }
      }
    });

    // Voice state updates for auto-leave functionality
    this.client.on("voiceStateUpdate", async (oldState, newState) => {
      // Check if this bot left a voice channel
      if (oldState.member.id === this.client.user.id && !newState.channelId) {
        // Bot left voice channel, remove from tracking
        this.botManager.removeBotFromGuild(oldState.guild.id);
        this.botManager.removeBotFromVoiceChannel(oldState.channelId);
        console.log(`🔌 Bot ${this.botIndex + 1} left voice channel ${oldState.channelId}`);
        return;
      }

      // Check if this bot joined a voice channel
      if (oldState.member.id === this.client.user.id && !oldState.channelId && newState.channelId) {
        // Bot joined a voice channel, track it
        this.botManager.voiceChannelUsage.set(newState.channelId, this.botIndex);
        console.log(`🎵 Bot ${this.botIndex + 1} joined voice channel ${newState.channelId}`);
      }

      // Check if this bot is in a voice channel
      const botVoiceState = newState.guild.members.cache.get(this.client.user.id)?.voice;
      if (!botVoiceState || !botVoiceState.channelId) return;

      // Check if the voice channel is empty (only bot remains)
      const voiceChannel = botVoiceState.channel;
      if (!voiceChannel) return;

      const membersInChannel = voiceChannel.members.filter(member => !member.user.bot);
      
      if (membersInChannel.size === 0) {
        // Voice channel is empty, set timer to leave
        console.log(`⏰ Bot ${this.botIndex + 1}: Voice channel empty, setting 1-minute timer`);
        
        setTimeout(async () => {
          // Check again if channel is still empty
          const currentVoiceState = newState.guild.members.cache.get(this.client.user.id)?.voice;
          if (currentVoiceState && currentVoiceState.channelId === voiceChannel.id) {
            const currentMembers = currentVoiceState.channel.members.filter(member => !member.user.bot);
            
            if (currentMembers.size === 0) {
              console.log(`⏰ Bot ${this.botIndex + 1}: Leaving empty voice channel after 1 minute`);
              
              // Stop the queue and disconnect
              const queue = this.client.distubePlayer.getQueue(newState.guild.id);
              if (queue) {
                queue.stop();
              }
              
              // Remove from guild and voice channel tracking
              this.botManager.removeBotFromGuild(newState.guild.id);
              this.botManager.removeBotFromVoiceChannel(voiceChannel.id);
            }
          }
        }, 60000); // 1 minute
      }
    });

    // Error handling for the bot
    this.client.on("error", (error) => {
      console.error(`❌ Bot ${this.botIndex + 1} error:`, error);
      this.botManager.updateBotStatus(this.botIndex, 'error');
    });

    this.client.on("disconnect", () => {
      console.log(`🔌 Bot ${this.botIndex + 1} disconnected`);
      this.botManager.updateBotStatus(this.botIndex, 'offline');
    });

    // Reconnect handling
    this.client.on("reconnecting", () => {
      console.log(`🔄 Bot ${this.botIndex + 1} reconnecting...`);
      this.botManager.updateBotStatus(this.botIndex, 'reconnecting');
    });

    this.client.on("resume", () => {
      console.log(`✅ Bot ${this.botIndex + 1} resumed connection`);
      this.botManager.updateBotStatus(this.botIndex, 'online');
    });
  }

  async start() {
    try {
      await this.client.login(this.token);
      console.log(`🚀 Bot ${this.botIndex + 1} login successful`);
    } catch (error) {
      console.error(`❌ Failed to start Bot ${this.botIndex + 1}:`, error);
    }
  }
}

// Multi-bot manager
class MultiBotManager {
  constructor() {
    this.bots = [];
    this.botUsage = new Map(); // Track which bot is in which guild
    this.voiceChannelUsage = new Map(); // Track which bot is in which voice channel
    this.botStatus = new Map(); // Track bot online/offline status
  }

  async initializeBots() {
    const tokens = process.env.BOT_TOKENS?.split(",").map((token) => token.trim()) || [];

    if (tokens.length === 0) {
      console.error("❌ BOT_TOKENS environment variable is required");
      console.error("Please add your Discord bot token(s) to the .env file");
      console.error("Format: BOT_TOKENS=token1,token2,token3");
      process.exit(1);
    }

    console.log(`🤖 Initializing ${tokens.length} independent bot(s)...`);

    // Create bot instances
    for (let i = 0; i < tokens.length; i++) {
      const bot = new MusicBot(tokens[i], i, this);
      this.bots.push(bot);
      this.botStatus.set(i, 'initializing');
    }

    // Start all bots
    const startPromises = this.bots.map(bot => bot.start());
    
    try {
      await Promise.all(startPromises);
      console.log(`✅ All ${tokens.length} independent bots started successfully!`);
      
      // Mark all bots as online
      this.bots.forEach((bot, index) => {
        this.botStatus.set(index, 'online');
      });
      
      console.log(`🎯 Independent bot system ready! Each token acts as a separate bot.`);
    } catch (error) {
      console.error("❌ Error starting bots:", error);
    }
  }

  // Get all online bots
  getAvailableBots() {
    return this.bots.filter((bot, index) => {
      return this.botStatus.get(index) === 'online';
    });
  }

  // Update bot status
  updateBotStatus(botIndex, status) {
    this.botStatus.set(botIndex, status);
    console.log(`🔄 Bot ${botIndex + 1} status: ${status}`);
  }

  // Remove bot from voice channel when it leaves
  removeBotFromVoiceChannel(voiceChannelId) {
    this.voiceChannelUsage.delete(voiceChannelId);
    console.log(`🔌 Bot removed from voice channel ${voiceChannelId}`);
  }

  // Remove bot from guild when it leaves
  removeBotFromGuild(guildId) {
    this.botUsage.delete(guildId);
    console.log(`🔌 Bot removed from guild ${guildId}`);
  }

  // Get all bots for debugging
  getAllBots() {
    return this.bots;
  }

  // Get bot usage statistics
  getBotUsageStats() {
    const stats = {};
    this.bots.forEach((bot, index) => {
      const status = this.botStatus.get(index) || 'unknown';
      stats[`Bot ${index + 1}`] = {
        guilds: 0,
        voiceChannels: 0,
        queues: 0,
        status: status
      };
    });

    // Count guilds per bot
    for (const [guildId, botIndex] of this.botUsage) {
      if (stats[`Bot ${botIndex + 1}`]) {
        stats[`Bot ${botIndex + 1}`].guilds++;
      }
    }

    // Count voice channels per bot
    for (const [voiceChannelId, botIndex] of this.voiceChannelUsage) {
      if (stats[`Bot ${botIndex + 1}`]) {
        stats[`Bot ${botIndex + 1}`].voiceChannels++;
      }
    }

    // Count active queues per bot
    this.bots.forEach((bot, index) => {
      try {
        const distube = bot.client.distubePlayer.getDisTube();
        const queues = distube.queues;
        if (stats[`Bot ${index + 1}`]) {
          stats[`Bot ${index + 1}`].queues = queues.size;
        }
      } catch (error) {
        console.error(`Error getting queue stats for Bot ${index + 1}:`, error);
      }
    });

    return stats;
  }

  // Get system health
  getSystemHealth() {
    const totalBots = this.bots.length;
    const onlineBots = this.getAvailableBots().length;
    const totalGuilds = this.botUsage.size;
    const totalVoiceChannels = this.voiceChannelUsage.size;
    
    return {
      totalBots,
      onlineBots,
      totalGuilds,
      totalVoiceChannels,
      health: onlineBots > 0 ? 'healthy' : 'unhealthy'
    };
  }
}

// Start the multi-bot system
const botManager = new MultiBotManager();
botManager.initializeBots().catch(console.error);

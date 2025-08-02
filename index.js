import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv";
import express from "express";
import DisTubePlayer from "./utils/disTubePlayer.js";
import botCoordinator from "./utils/botCoordinator.js";

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
const PORT = process.env.PORT || 3002;

app.get("/", (req, res) => {
  res.send("🎵 Den Music Bots are running!");
});

app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

// Dynamic bot token detection - supports unlimited bots
const getBotTokens = () => {
  const tokens = [];
  let botIndex = 1;
  
  // Dynamically find all bot tokens (supports unlimited bots)
  while (true) {
    const token = process.env[`BOT_TOKEN_${botIndex}`];
    const clientId = process.env[`BOT_CLIENT_ID_${botIndex}`];
    
    if (!token || !clientId) {
      break; // Stop when we don't find a token or client ID
    }
    
    tokens.push({ 
      id: botIndex, 
      token, 
      clientId 
    });
    botIndex++;
  }
  
  if (tokens.length === 0) {
    console.error("❌ No bot tokens found in environment variables");
    console.error("Please set BOT_TOKEN_1, BOT_TOKEN_2, etc. and BOT_CLIENT_ID_1, BOT_CLIENT_ID_2, etc. in your .env file");
    console.error("Example:");
    console.error("BOT_TOKEN_1=your_token_1");
    console.error("BOT_CLIENT_ID_1=your_client_id_1");
    console.error("BOT_TOKEN_2=your_token_2");
    console.error("BOT_CLIENT_ID_2=your_client_id_2");
    process.exit(1);
  }
  
  console.log(`🔍 Found ${tokens.length} bot(s) in environment variables`);
  tokens.forEach(({ id, token, clientId }) => {
    console.log(`   Bot ${id}: Token ${token.substring(0, 10)}..., Client ID: ${clientId}`);
  });
  
  return tokens;
};

// Bot class for individual bot instances
class MusicBot {
  constructor(token, botId) {
    this.token = token;
    this.botId = botId;
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

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
      console.log(`🎵 Bot ${this.botId}: ${this.client.user.tag} is ready!`);
      console.log(`🎧 DisTube music player initialized for Bot ${this.botId}`);
      console.log(`🆔 Bot ID: ${this.botId}, Token: ${this.token.substring(0, 10)}...`);
      
      // Register this bot with the coordinator
      botCoordinator.registerBot(this.botId, this.client);
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
          // Handle the command with this bot
          console.log(`🎵 Bot ${this.botId} (${this.client.user.username}) handling command: ${interaction.commandName}`);
          await command.execute(interaction, this.botId);
        } catch (error) {
          console.error(
            `❌ Error executing command ${interaction.commandName} on Bot ${this.botId}:`,
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

          try {
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp(errorMessage);
            } else {
              await interaction.reply(errorMessage);
            }
          } catch (followUpError) {
            // Handle Discord API errors like Unknown Message (10008)
            if (followUpError.code === 10008) {
              console.log(`⚠️ Interaction message not found, skipping error response for Bot ${this.botId}`);
            } else {
              console.error(`❌ Failed to send error response for Bot ${this.botId}:`, followUpError);
            }
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
          console.error(`Button interaction error on Bot ${this.botId}:`, error);
          try {
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
          } catch (replyError) {
            // Handle Discord API errors like Unknown Message (10008)
            if (replyError.code === 10008) {
              console.log(`⚠️ Button interaction message not found, skipping error response for Bot ${this.botId}`);
            } else {
              console.error(`❌ Failed to send button error response for Bot ${this.botId}:`, replyError);
            }
          }
        }
      }
    });

    // Voice state updates for auto-leave functionality and coordinator updates
    this.client.on("voiceStateUpdate", async (oldState, newState) => {
      // Check if this bot left a voice channel
      if (oldState.member.id === this.client.user.id && !newState.channelId) {
        console.log(`🔌 Bot ${this.botId} left voice channel ${oldState.channelId}`);
        // Update coordinator - bot is now available
        botCoordinator.updateBotState(this.botId, null);
        return;
      }

      // Check if this bot joined a voice channel
      if (oldState.member.id === this.client.user.id && !oldState.channelId && newState.channelId) {
        console.log(`🎵 Bot ${this.botId} joined voice channel ${newState.channelId}`);
        // Update coordinator - bot is now in this voice channel
        botCoordinator.updateBotState(this.botId, newState.channelId);
      }

      // Check if this bot is in a voice channel
      const botVoiceState = newState.guild.members.cache.get(this.client.user.id)?.voice;
      if (!botVoiceState || !botVoiceState.channelId) return;

      // Check if the voice channel is empty (except for the bot)
      const voiceChannel = botVoiceState.channel;
      const members = voiceChannel.members.filter(member => !member.user.bot);

      if (members.size === 0) {
        console.log(`⏰ Bot ${this.botId}: Voice channel empty, setting 1-minute timer`);
        
        // Set a timer to leave the voice channel after 1 minute
        setTimeout(async () => {
          const currentVoiceState = newState.guild.members.cache.get(this.client.user.id)?.voice;
          if (currentVoiceState && currentVoiceState.channelId === voiceChannel.id) {
            const currentMembers = currentVoiceState.channel.members.filter(member => !member.user.bot);
            if (currentMembers.size === 0) {
              console.log(`🚪 Bot ${this.botId}: Leaving empty voice channel after 1 minute`);
              const distubePlayer = this.client.distubePlayer;
              if (distubePlayer) {
                const queue = distubePlayer.getQueue(newState.guild.id);
                if (queue) {
                  queue.stop();
                }
              }
              // Update coordinator - bot is now available
              botCoordinator.updateBotState(this.botId, null);
            }
          }
        }, 60000); // 1 minute
      }
    });

    // Error handling
    this.client.on("error", (error) => {
      console.error(`❌ Bot ${this.botId} error:`, error);
      
      // Handle specific Discord API errors
      if (error.code === 10008) {
        console.log(`⚠️ Bot ${this.botId}: Unknown Message error - interaction may have expired`);
      } else if (error.code === 10062) {
        console.log(`⚠️ Bot ${this.botId}: Unknown Interaction error - interaction may have expired`);
      } else if (error.code === 50001) {
        console.log(`⚠️ Bot ${this.botId}: Missing Access error - bot may not have required permissions`);
      } else {
        console.error(`❌ Bot ${this.botId} unhandled error:`, error);
      }
    });

    // Handle unhandled promise rejections
    this.client.on("unhandledRejection", (reason, promise) => {
      console.error(`❌ Bot ${this.botId} unhandled promise rejection:`, reason);
      
      // Handle Discord API errors in promise rejections
      if (reason && reason.code) {
        if (reason.code === 10008) {
          console.log(`⚠️ Bot ${this.botId}: Unknown Message in promise rejection - interaction may have expired`);
        } else if (reason.code === 10062) {
          console.log(`⚠️ Bot ${this.botId}: Unknown Interaction in promise rejection - interaction may have expired`);
        }
      }
    });

    this.client.on("disconnect", () => {
      console.log(`🔌 Bot ${this.botId} disconnected`);
    });

    this.client.on("reconnecting", () => {
      console.log(`🔄 Bot ${this.botId} reconnecting...`);
    });
  }

  async start() {
    try {
      console.log(`🚀 Starting Bot ${this.botId}...`);
      await this.client.login(this.token);
      console.log(`✅ Bot ${this.botId} login successful`);
    } catch (error) {
      console.error(`❌ Bot ${this.botId} login failed:`, error);
      process.exit(1);
    }
  }
}

// Multi-bot manager for the new process-based approach
class MultiBotManager {
  constructor() {
    this.bots = new Map();
    this.tokens = getBotTokens();
  }

  async initializeBots() {
    console.log(`🤖 Initializing ${this.tokens.length} independent bot(s)...`);
    
    const botPromises = this.tokens.map(({ id, token }) => {
      const bot = new MusicBot(token, id);
      this.bots.set(id, bot);
      return bot.start();
    });

    try {
      await Promise.all(botPromises);
      console.log(`✅ All ${this.tokens.length} independent bots started successfully!`);
      console.log(`🎯 Independent bot system ready! Each token acts as a separate bot.`);
      console.log(`📊 System Status: ${this.tokens.length} bots online and ready`);
      
      // Log coordinator state after all bots are ready
      setTimeout(() => {
        botCoordinator.logState();
      }, 2000);
    } catch (error) {
      console.error("❌ Failed to start bots:", error);
      process.exit(1);
    }
  }

  getBotStatus() {
    const status = {
      totalBots: this.tokens.length,
      activeBots: this.bots.size,
      bots: []
    };

    this.bots.forEach((bot, id) => {
      status.bots.push({
        id,
        username: bot.client.user?.username || 'Unknown',
        status: bot.client.ws?.status || 'offline'
      });
    });

    return status;
  }
}

// Start the multi-bot system
const botManager = new MultiBotManager();
botManager.initializeBots().catch(console.error);

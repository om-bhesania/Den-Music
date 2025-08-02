import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv";
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

class MusicBot {
  constructor() {
    // Get bot token from environment (set by process manager)
    this.token = process.env.BOT_TOKEN;
    this.botId = process.env.BOT_ID || '1';
    
    if (!this.token) {
      console.error("❌ BOT_TOKEN environment variable is required");
      process.exit(1);
    }

    // Create Discord client
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    // Initialize DisTube player
    this.client.distubePlayer = new DisTubePlayer(this.client);

    // Command collection
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
          await command.execute(interaction, this.client);
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
          console.error(`Button interaction error on Bot ${this.botId}:`, error);
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
        console.log(`🔌 Bot ${this.botId} left voice channel ${oldState.channelId}`);
        return;
      }

      // Check if this bot joined a voice channel
      if (oldState.member.id === this.client.user.id && !oldState.channelId && newState.channelId) {
        console.log(`🎵 Bot ${this.botId} joined voice channel ${newState.channelId}`);
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
            }
          }
        }, 60000); // 1 minute
      }
    });

    // Error handling
    this.client.on("error", (error) => {
      console.error(`❌ Bot ${this.botId} error:`, error);
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

// Start the bot
const bot = new MusicBot();
bot.start().catch(console.error); 
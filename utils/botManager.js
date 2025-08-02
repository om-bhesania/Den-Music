import {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
} from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

class BotManager {
  constructor() {
    this.bots = new Map();
    this.voiceConnections = new Map();
    this.botStates = new Map();
  }

  async initializeBots(tokens, interactionHandler) {
    const tokenArray = tokens.split(",").map((token) => token.trim());

    for (let i = 0; i < tokenArray.length; i++) {
      const token = tokenArray[i];
      const botId = `bot_${i + 1}`;
      const botName = i === 0 ? "Den Music" : `Den Music ${i + 1}`;

      try {
        const client = new Client({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
          ],
        });

        client.commands = new Collection();
        client.botId = botId;
        client.botName = botName;
        client.botIndex = i;

        // Set up event handlers
        client.once("ready", () => {
          console.log(`✅ ${botName} is online!`);
          this.setIdleStatus(client);
        });

        client.on("interactionCreate", (interaction) =>
          interactionHandler(interaction, client)
        );

        client.on("voiceStateUpdate", (oldState, newState) => {
          this.handleVoiceStateUpdate(oldState, newState, client);
        });

        await client.login(token);
        this.bots.set(botId, client);
        this.botStates.set(botId, {
          busy: false,
          guildId: null,
          channelId: null,
          lastActivity: Date.now(),
        });
      } catch (error) {
        console.error(`❌ Failed to initialize ${botName}:`, error.message);
      }
    }

    console.log(`🚀 Initialized ${this.bots.size} bot(s)`);
  }

  getAvailableBot(guildId, voiceChannelId) {
    // First, check if there's already a bot in this voice channel
    for (const [botId, state] of this.botStates.entries()) {
      if (state.guildId === guildId && state.channelId === voiceChannelId) {
        return this.bots.get(botId);
      }
    }

    // Find first available bot
    for (const [botId, state] of this.botStates.entries()) {
      if (!state.busy) {
        return this.bots.get(botId);
      }
    }

    return null;
  }

  async connectToVoiceChannel(bot, voiceChannel) {
    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
      });

      this.voiceConnections.set(voiceChannel.guild.id, connection);
      this.botStates.set(bot.botId, {
        busy: true,
        guildId: voiceChannel.guild.id,
        channelId: voiceChannel.id,
        lastActivity: Date.now(),
      });

      console.log(
        `🎵 ${bot.botName} connected to ${voiceChannel.name} in ${voiceChannel.guild.name}`
      );
      return connection;
    } catch (error) {
      console.error(`❌ Failed to connect ${bot.botName}:`, error.message);
      throw error;
    }
  }

  disconnectFromVoiceChannel(guildId) {
    const connection = this.voiceConnections.get(guildId);
    if (connection) {
      connection.destroy();
      this.voiceConnections.delete(guildId);

      // Find and update bot state
      for (const [botId, state] of this.botStates.entries()) {
        if (state.guildId === guildId) {
          this.botStates.set(botId, {
            busy: false,
            guildId: null,
            channelId: null,
            lastActivity: Date.now(),
          });

          const bot = this.bots.get(botId);
          this.setIdleStatus(bot);
          console.log(`🔇 ${bot.botName} disconnected from ${guildId}`);
          break;
        }
      }
    }
  }

  getVoiceConnection(guildId) {
    return this.voiceConnections.get(guildId);
  }

  setMusicStatus(bot, songTitle) {
    bot.user.setActivity(songTitle, { type: ActivityType.Listening });
  }

  setIdleStatus(bot) {
    bot.user.setActivity("the DEN", { type: ActivityType.Watching });
  }

  handleVoiceStateUpdate(oldState, newState, bot) {
    // Auto-disconnect if bot is alone in channel
    if (oldState.channelId && oldState.channel) {
      const members = oldState.channel.members.filter(
        (member) => !member.user.bot
      );
      if (members.size === 0) {
        setTimeout(() => {
          const currentMembers = oldState.channel?.members.filter(
            (member) => !member.user.bot
          );
          if (currentMembers?.size === 0) {
            this.disconnectFromVoiceChannel(oldState.guild.id);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    }
  }

  getActiveBotCount() {
    return Array.from(this.botStates.values()).filter((state) => state.busy)
      .length;
  }

  getAllBots() {
    return Array.from(this.bots.values());
  }

  getBusyBots() {
    const busyBots = [];
    for (const [botId, state] of this.botStates.entries()) {
      if (state.busy) {
        busyBots.push({
          bot: this.bots.get(botId),
          state: state,
        });
      }
    }
    return busyBots;
  }
}

export default new BotManager();

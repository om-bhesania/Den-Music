import { config } from 'dotenv';

config();

class BotCoordinator {
  constructor() {
    this.botStates = new Map(); // Track bot states across processes
    this.voiceChannelAssignments = new Map(); // Track which bot is in which VC
    this.pendingRequests = new Map(); // Track pending play requests
    this.botClients = new Map(); // Store bot client references for cross-bot communication
  }

  // Register a bot's state
  registerBot(botId, client) {
    this.botStates.set(botId, {
      id: botId,
      client: client,
      voiceChannelId: null,
      isAvailable: true,
      lastActivity: Date.now()
    });
    this.botClients.set(botId, client); // Store client reference
    console.log(`🤖 Bot ${botId} registered with coordinator`);
  }

  // Update bot's voice channel state
  updateBotState(botId, voiceChannelId) {
    const botState = this.botStates.get(botId);
    if (botState) {
      botState.voiceChannelId = voiceChannelId;
      botState.isAvailable = !voiceChannelId; // Available if not in any VC
      botState.lastActivity = Date.now();
      
      // Update voice channel assignments
      if (voiceChannelId) {
        this.voiceChannelAssignments.set(voiceChannelId, botId);
      } else {
        // Remove from assignments if leaving VC
        for (const [vcId, assignedBotId] of this.voiceChannelAssignments.entries()) {
          if (assignedBotId === botId) {
            this.voiceChannelAssignments.delete(vcId);
          }
        }
      }
      
      console.log(`📊 Bot ${botId} state updated: VC=${voiceChannelId}, Available=${botState.isAvailable}`);
    }
  }

  // Find the best bot for a voice channel
  findBestBotForVoiceChannel(targetVoiceChannelId) {
    // First, check if a bot is already in this voice channel
    const botInChannel = this.voiceChannelAssignments.get(targetVoiceChannelId);
    if (botInChannel) {
      console.log(`🎯 Bot ${botInChannel} already in target voice channel ${targetVoiceChannelId}`);
      return botInChannel;
    }

    // Find available bots (not in any voice channel)
    const availableBots = Array.from(this.botStates.values())
      .filter(bot => bot.isAvailable)
      .sort((a, b) => a.lastActivity - b.lastActivity); // Prefer least recently used

    if (availableBots.length === 0) {
      console.log(`❌ No available bots found`);
      return null;
    }

    const selectedBot = availableBots[0];
    console.log(`🎯 Selected Bot ${selectedBot.id} for voice channel ${targetVoiceChannelId}`);
    return selectedBot.id;
  }

  // Check if a bot should handle a command
  shouldBotHandleCommand(botId, targetVoiceChannelId) {
    const botState = this.botStates.get(botId);
    if (!botState) {
      console.log(`❌ Bot ${botId} not found in bot states`);
      return false;
    }

    // If bot is in the target voice channel, it should handle it
    if (botState.voiceChannelId === targetVoiceChannelId) {
      return true;
    }

    // If bot is not in any voice channel, it can handle it
    if (botState.isAvailable) {
      return true;
    }

    // Bot is in a different voice channel, shouldn't handle it
    return false;
  }

  // NEW: Actually make the correct bot join and play
  async makeBotJoinAndPlay(targetBotId, interaction, query) {
    const targetClient = this.botClients.get(targetBotId);
    if (!targetClient) {
      console.log(`❌ Bot ${targetBotId} client not found`);
      return false;
    }

    try {
      console.log(`🤖 Making Bot ${targetBotId} join and play...`);
      
      // Get the voice channel from the interaction
      const voiceChannel = interaction.member.voice.channel;
      
      // Make the target bot join the voice channel
      // Since the interaction has already been replied to, we'll use followUp
      await targetClient.distubePlayer.play(interaction, query, true);
      
      // Update the bot state
      this.updateBotState(targetBotId, voiceChannel.id);
      
      // Send a follow-up message to confirm the bot switch
      if (interaction.replied) {
        await interaction.followUp({
          embeds: [{
            color: 0x00ff00,
            title: "✅ Success",
            description: `Bot ${targetBotId} is now playing your request!`
          }],
          flags: 64
        });
      }
      
      console.log(`✅ Bot ${targetBotId} successfully joined and started playing`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to make Bot ${targetBotId} join and play:`, error);
      return false;
    }
  }

  // Get bot statistics
  getBotStats() {
    const stats = {
      totalBots: this.botStates.size,
      availableBots: Array.from(this.botStates.values()).filter(bot => bot.isAvailable).length,
      busyBots: Array.from(this.botStates.values()).filter(bot => !bot.isAvailable).length,
      voiceChannelAssignments: this.voiceChannelAssignments.size
    };
    return stats;
  }

  // Log current state
  logState() {
    console.log(`📊 Bot Coordinator State:`);
    console.log(`   Total Bots: ${this.botStates.size}`);
    console.log(`   Available: ${Array.from(this.botStates.values()).filter(bot => bot.isAvailable).length}`);
    console.log(`   Busy: ${Array.from(this.botStates.values()).filter(bot => !bot.isAvailable).length}`);
    console.log(`   Voice Channel Assignments: ${this.voiceChannelAssignments.size}`);
    
    for (const [botId, state] of this.botStates) {
      console.log(`   Bot ${botId}: VC=${state.voiceChannelId}, Available=${state.isAvailable}`);
    }
  }
}

// Create a singleton instance
const botCoordinator = new BotCoordinator();

export default botCoordinator; 
// Simple test to verify bot selection logic
console.log("🧪 Testing Bot Selection Logic");
console.log("=============================\n");

// Simulate the bot selection logic
class MockBotManager {
  constructor() {
    this.bots = [
      { botIndex: 0, name: "Bot 1" },
      { botIndex: 1, name: "Bot 2" },
    ];
    this.voiceChannelUsage = new Map();
    this.botStatus = new Map();

    // Set all bots as online
    this.bots.forEach((bot, index) => {
      this.botStatus.set(index, "online");
    });
  }

  getAvailableBots() {
    return this.bots.filter((bot, index) => {
      return this.botStatus.get(index) === "online";
    });
  }

  getBotForVoiceChannel(guildId, voiceChannelId) {
    // Check if any bot is already in this voice channel
    const existingBotIndex = this.voiceChannelUsage.get(voiceChannelId);

    if (existingBotIndex !== undefined) {
      const existingBot = this.bots[existingBotIndex];
      if (existingBot && this.botStatus.get(existingBotIndex) === "online") {
        console.log(
          `✅ Using existing Bot ${
            existingBotIndex + 1
          } for voice channel ${voiceChannelId}`
        );
        return existingBot;
      } else {
        this.voiceChannelUsage.delete(voiceChannelId);
      }
    }

    // Find the best available bot for this voice channel
    const availableBots = this.getAvailableBots();

    if (availableBots.length === 0) {
      console.error(`❌ No available bots for voice channel ${voiceChannelId}`);
      return null;
    }

    // Select bot based on load balancing strategy
    const selectedBot = this.selectBestBotForVoiceChannel(
      availableBots,
      voiceChannelId
    );

    if (selectedBot) {
      // Register this bot for this voice channel
      this.voiceChannelUsage.set(voiceChannelId, selectedBot.botIndex);
      console.log(
        `🤖 Assigned Bot ${
          selectedBot.botIndex + 1
        } to voice channel ${voiceChannelId}`
      );
    }

    return selectedBot;
  }

  selectBestBotForVoiceChannel(availableBots, voiceChannelId) {
    if (availableBots.length === 0) return null;

    // Strategy: Find bot with fewest active voice channels
    const botVoiceChannelCounts = new Map();
    availableBots.forEach((bot) => {
      botVoiceChannelCounts.set(bot.botIndex, 0);
    });

    // Count voice channels per bot
    for (const [vcId, botIndex] of this.voiceChannelUsage) {
      if (botVoiceChannelCounts.has(botIndex)) {
        botVoiceChannelCounts.set(
          botIndex,
          botVoiceChannelCounts.get(botIndex) + 1
        );
      }
    }

    // Find bot with lowest voice channel count
    let bestBot = availableBots[0];
    let minVoiceChannels = Infinity;

    for (const bot of availableBots) {
      const voiceChannelCount = botVoiceChannelCounts.get(bot.botIndex) || 0;
      if (voiceChannelCount < minVoiceChannels) {
        minVoiceChannels = voiceChannelCount;
        bestBot = bot;
      }
    }

    console.log(
      `⚖️ Voice channel load balancing: Bot ${
        bestBot.botIndex + 1
      } selected (voice channels: ${minVoiceChannels})`
    );
    return bestBot;
  }
}

// Test the logic
const botManager = new MockBotManager();

console.log("🎯 Test Scenario: User switching voice channels\n");

// Test 1: First voice channel
console.log("📋 Test 1: User plays in VC1");
botManager.getBotForVoiceChannel("guild1", "vc1");

// Test 2: Second voice channel
console.log("\n📋 Test 2: User switches to VC2");
botManager.getBotForVoiceChannel("guild1", "vc2");

// Test 3: Third voice channel
console.log("\n📋 Test 3: User switches to VC3");
botManager.getBotForVoiceChannel("guild1", "vc3");

// Test 4: Back to first voice channel
console.log("\n📋 Test 4: User returns to VC1");
botManager.getBotForVoiceChannel("guild1", "vc1");

console.log("\n✅ Test completed!");
console.log("Expected behavior:");
console.log("- VC1: Bot 1");
console.log("- VC2: Bot 2");
console.log("- VC3: Bot 1 (least loaded)");
console.log("- VC1 again: Bot 1 (existing assignment)");

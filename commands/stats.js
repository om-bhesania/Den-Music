import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show bot usage statistics and system health"),

  async execute(interaction, client) {
    try {
      const botManager = client.botManager;
      
      if (!botManager) {
        return interaction.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "❌ Error",
              description: "Bot manager not available.",
            },
          ],
          flags: 64,
        });
      }

      const stats = botManager.getBotUsageStats();
      const health = botManager.getSystemHealth();
      
      let description = "**🤖 Bot Usage Statistics**\n\n";
      
      for (const [botName, botStats] of Object.entries(stats)) {
        const statusEmoji = {
          'online': '🟢',
          'offline': '🔴',
          'error': '🟡',
          'reconnecting': '🔄',
          'initializing': '⏳',
          'unknown': '❓'
        }[botStats.status] || '❓';
        
        description += `**${botName}** ${statusEmoji}\n`;
        description += `• Status: ${botStats.status}\n`;
        description += `• Guilds: ${botStats.guilds}\n`;
        description += `• Voice Channels: ${botStats.voiceChannels}\n`;
        description += `• Active Queues: ${botStats.queues}\n\n`;
      }

      description += `**📊 System Health**\n`;
      description += `• Total Bots: ${health.totalBots}\n`;
      description += `• Online Bots: ${health.onlineBots}\n`;
      description += `• Total Guilds: ${health.totalGuilds}\n`;
      description += `• Active Voice Channels: ${health.totalVoiceChannels}\n`;
      description += `• System Status: ${health.health === 'healthy' ? '🟢 Healthy' : '🔴 Unhealthy'}\n\n`;

      if (health.onlineBots < health.totalBots) {
        description += `⚠️ **Warning**: ${health.totalBots - health.onlineBots} bot(s) are offline\n`;
      }

      const embed = {
        color: health.health === 'healthy' ? 0x00ff00 : 0xff0000,
        title: "📊 Bot Statistics & System Health",
        description: description,
        timestamp: new Date(),
        footer: {
          text: `Dynamic scaling ready - Add more tokens to .env to scale automatically`
        }
      };

      await interaction.reply({
        embeds: [embed],
        flags: 64,
      });
      
    } catch (error) {
      console.error("Stats command error:", error);
      
      const errorEmbed = {
        color: 0xff0000,
        title: "❌ Error",
        description: "Failed to get bot statistics",
      };

      await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }
  },
}; 
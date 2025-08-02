import { SlashCommandBuilder } from "discord.js";
import botCoordinator from "../utils/botCoordinator.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song"),

  async execute(interaction, botId) {
    try {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      const currentBotId = botId;

      if (!voiceChannel) {
        return interaction.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "❌ Error",
              description: "You need to be in a voice channel to use this command!",
            },
          ],
          flags: 64,
        });
      }

      // Check if this bot should handle this command
      const shouldHandle = botCoordinator.shouldBotHandleCommand(currentBotId, voiceChannel.id);
      
      if (!shouldHandle) {
        // Find the best bot for this voice channel
        const bestBotId = botCoordinator.findBestBotForVoiceChannel(voiceChannel.id);
        
        if (bestBotId && bestBotId !== currentBotId) {
          console.log(`🚫 Bot ${currentBotId} (${interaction.client.user.username}) cannot handle pause command - Bot ${bestBotId} should handle voice channel ${voiceChannel.id}`);
          
          return interaction.reply({
            embeds: [
              {
                color: 0xff6b35,
                title: "🔄 Bot Coordination",
                description: `Please use the bot that's currently playing music in this voice channel.`,
              },
            ],
            flags: 64,
          });
        }
      }

      const distubePlayer = interaction.client.distubePlayer;
      
      if (!distubePlayer) {
        return interaction.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "❌ Error",
              description: "Music player is not initialized.",
            },
          ],
          flags: 64,
        });
      }

      console.log(`🎵 Bot ${currentBotId} (${interaction.client.user.username}) handling pause command for voice channel ${voiceChannel.id}`);

      await distubePlayer.pause(interaction);
      
    } catch (error) {
      console.error("Pause command error:", error);
      await interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: "❌ Error",
            description: "Failed to pause the music",
          },
        ],
        flags: 64,
      });
    }
  },
};

import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Toggle autoplay for similar songs"),

  async execute(interaction, client) {
    try {
      const distubePlayer = client.distubePlayer;
      
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

      const queue = distubePlayer.getQueue(interaction.guildId);
      
      if (!queue) {
        return interaction.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "❌ Error",
              description: "Nothing is currently playing!",
            },
          ],
          flags: 64,
        });
      }

      // Toggle autoplay
      queue.toggleAutoplay();
      
      await interaction.reply({
        embeds: [
          {
            color: 0x00ff00,
            title: "🔄 Autoplay Toggled",
            description: `Autoplay is now **${queue.autoplay ? 'enabled' : 'disabled'}**!`,
          },
        ],
        flags: 64,
      });
      
    } catch (error) {
      console.error("Autoplay command error:", error);
      await interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: "❌ Error",
            description: "Failed to toggle autoplay",
          },
        ],
        flags: 64,
      });
    }
  },
};

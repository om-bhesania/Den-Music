import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Disconnect from voice channel"),

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
              description: "Not connected to any voice channel!",
            },
          ],
          flags: 64,
        });
      }

      queue.stop();
      
      await interaction.reply({
        embeds: [
          {
            color: 0x00ff00,
            title: "✅ Disconnected",
            description: "Successfully disconnected from voice channel!",
          },
        ],
        flags: 64,
      });
      
    } catch (error) {
      console.error("Disconnect command error:", error);
      await interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: "❌ Error",
            description: "Failed to disconnect from voice channel",
          },
        ],
        flags: 64,
      });
    }
  },
};

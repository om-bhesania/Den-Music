import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song"),

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

      await distubePlayer.skip(interaction);
      
    } catch (error) {
      console.error("Skip command error:", error);
      await interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: "❌ Error",
            description: "Failed to skip the song",
          },
        ],
        flags: 64,
      });
    }
  },
};

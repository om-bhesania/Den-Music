import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set the volume (0-100)")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("Volume level (0-100)")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),

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

      const volume = interaction.options.getInteger("level");
      await distubePlayer.volume(interaction, volume);
      
    } catch (error) {
      console.error("Volume command error:", error);
      await interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: "❌ Error",
            description: "Failed to set volume",
          },
        ],
        flags: 64,
      });
    }
  },
};

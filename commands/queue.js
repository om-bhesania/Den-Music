import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue"),

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

      await distubePlayer.queue(interaction);
      
    } catch (error) {
      console.error("Queue command error:", error);
      await interaction.reply({
        embeds: [
          {
            color: 0xff0000,
            title: "❌ Error",
            description: "Failed to show queue",
          },
        ],
        flags: 64,
      });
    }
  },
};

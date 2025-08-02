import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

  async execute(interaction, client) {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🎵 Den Music Bot - Commands")
      .setDescription("Here are all the available commands:")
      .addFields(
        {
          name: "🎵 `/play <query>`",
          value: "Play a song or playlist from YouTube, Spotify, SoundCloud, or any URL",
          inline: false,
        },
        {
          name: "⏭️ `/skip`",
          value: "Skip the current song",
          inline: true,
        },
        {
          name: "⏹️ `/stop`",
          value: "Stop playing and clear the queue",
          inline: true,
        },
        {
          name: "⏸️ `/pause`",
          value: "Pause the current song",
          inline: true,
        },
        {
          name: "▶️ `/resume`",
          value: "Resume the paused song",
          inline: true,
        },
        {
          name: "🔊 `/volume <level>`",
          value: "Set volume (0-100)",
          inline: true,
        },
        {
          name: "📋 `/queue`",
          value: "Show the current music queue",
          inline: true,
        },
        {
          name: "🎶 `/nowplaying`",
          value: "Show the currently playing song",
          inline: true,
        },
        {
          name: "🔄 `/autoplay`",
          value: "Toggle autoplay for similar songs",
          inline: true,
        },
        {
          name: "🚪 `/disconnect`",
          value: "Disconnect from voice channel",
          inline: true,
        },
        {
          name: "❓ `/help`",
          value: "Show this help message",
          inline: true,
        }
      )
      .setFooter({
        text: "Powered by DisTube • Supports YouTube, Spotify, SoundCloud & more!",
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [helpEmbed],
      flags: 64,
    });
  },
};

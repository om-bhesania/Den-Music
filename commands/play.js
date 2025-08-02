import { SlashCommandBuilder } from "discord.js";
import DisTubePlayer from "../utils/disTubePlayer.js";

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song or playlist")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Song name, URL, or search query")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    try {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      const guildId = interaction.guildId;
      const voiceChannelId = voiceChannel?.id;

      if (!voiceChannel) {
        return interaction.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "❌ Error",
              description: "You need to be in a voice channel to play music!",
            },
          ],
          flags: 64,
        });
      }

      // Get the bot manager to track voice channel usage
      const botManager = client.botManager;
      const currentBotIndex = client.botIndex || 0;
      
      if (botManager) {
        // Check if this bot is already in a different voice channel
        const currentBotVoiceChannels = [];
        for (const [vcId, botIndex] of botManager.voiceChannelUsage) {
          if (botIndex === currentBotIndex) {
            currentBotVoiceChannels.push(vcId);
          }
        }
        
        // If this bot is already in a different voice channel, stop it first
        if (currentBotVoiceChannels.length > 0 && !currentBotVoiceChannels.includes(voiceChannelId)) {
          console.log(`🔄 Bot ${client.user.username} switching from ${currentBotVoiceChannels[0]} to ${voiceChannelId}`);
          
          // Stop the current queue
          const distubePlayer = client.distubePlayer;
          if (distubePlayer) {
            const currentQueue = distubePlayer.getQueue(guildId);
            if (currentQueue) {
              currentQueue.stop();
            }
          }
          
          // Remove from old voice channel tracking
          for (const vcId of currentBotVoiceChannels) {
            botManager.voiceChannelUsage.delete(vcId);
          }
        }

        // Assign this bot to the voice channel
        botManager.voiceChannelUsage.set(voiceChannelId, currentBotIndex);
        console.log(`🤖 Bot ${client.user.username} assigned to voice channel ${voiceChannelId}`);
      }

      // Use the current bot's DisTube player
      const distubePlayer = client.distubePlayer;
      
      if (!distubePlayer) {
        return interaction.reply({
          embeds: [
            {
              color: 0xff0000,
              title: "❌ Error",
              description: "Music player is not initialized. Please try again.",
            },
          ],
          flags: 64,
        });
      }

      const query = interaction.options.getString("query");
      
      // Use DisTube to play the song
      await distubePlayer.play(interaction, query);
      
    } catch (error) {
      console.error("Play command error:", error);
      
      const errorEmbed = {
        color: 0xff0000,
        title: "❌ Error",
        description: error.message || "Failed to play the requested song",
      };

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      }
    }
  },
};

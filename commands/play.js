import { SlashCommandBuilder } from "discord.js";
import DisTubePlayer from "../utils/disTubePlayer.js";
import botCoordinator from "../utils/botCoordinator.js";

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

  async execute(interaction, botId) {
    try {
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      const guildId = interaction.guildId;
      const currentBotId = botId;

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

      // Check if this bot should handle this command
      const shouldHandle = botCoordinator.shouldBotHandleCommand(currentBotId, voiceChannel.id);
      
      if (!shouldHandle) {
        // Find the best bot for this voice channel
        const bestBotId = botCoordinator.findBestBotForVoiceChannel(voiceChannel.id);
        
        if (bestBotId && bestBotId !== currentBotId) {
          console.log(`🚫 Bot ${currentBotId} (${interaction.client.user.username}) cannot handle play command - Bot ${bestBotId} should handle voice channel ${voiceChannel.id}`);
          
          // Send initial response
          await interaction.reply({
            embeds: [
              {
                color: 0x00ff00,
                title: "🔄 Bot Coordination",
                description: `Bot ${bestBotId} will join and play music in this voice channel...`,
              },
            ],
            flags: 64,
          });

          // Actually make the correct bot join and play
          const query = interaction.options.getString("query");
          const success = await botCoordinator.makeBotJoinAndPlay(bestBotId, interaction, query);
          
          if (success) {
            // Update the response to show success
            await interaction.editReply({
              embeds: [
                {
                  color: 0x00ff00,
                  title: "✅ Bot Coordination",
                  description: `Bot ${bestBotId} has joined and is playing music!`,
                },
              ],
              flags: 64,
            });
          } else {
            // Update the response to show failure
            await interaction.editReply({
              embeds: [
                {
                  color: 0xff0000,
                  title: "❌ Bot Coordination Failed",
                  description: `Failed to make Bot ${bestBotId} join and play. Please try again.`,
                },
              ],
              flags: 64,
            });
          }
          
          return;
        } else if (!bestBotId) {
          return interaction.reply({
            embeds: [
              {
                color: 0xff6b35,
                title: "❌ No Available Bot",
                description: `All bots are currently busy. Please wait for a bot to become available.`,
              },
            ],
            flags: 64,
          });
        }
      }

      // Use the current bot's DisTube player
      const distubePlayer = interaction.client.distubePlayer;
      
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
      
      console.log(`🎵 Bot ${currentBotId} (${interaction.client.user.username}) handling play command for voice channel ${voiceChannel.id}`);
      
      // Update bot state to show it's handling this voice channel
      botCoordinator.updateBotState(currentBotId, voiceChannel.id);
      
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
  }
};

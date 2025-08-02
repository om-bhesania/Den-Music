import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

class EmbedBuilderClass {
  createMusicEmbed(songInfo, bot, settings = {}) {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`🎵 Now Playing: ${songInfo.title}`)
      .setDescription(`**Artist:** ${songInfo.artist}`)
      .setURL(songInfo.url)
      .setThumbnail(songInfo.thumbnail)
      .addFields(
        {
          name: "⏱️ Duration",
          value: songInfo.duration || "Unknown",
          inline: true,
        },
        {
          name: "🔊 Volume",
          value: `${settings.volume || 50}%`,
          inline: true,
        },
        {
          name: "🔄 Autoplay",
          value: settings.autoplay ? "Enabled" : "Disabled",
          inline: true,
        },
        {
          name: "📡 Source",
          value: songInfo.source || "Unknown",
          inline: true,
        }
      )
      .setFooter({
        text: `Requested by ${bot.username}`,
        iconURL: bot.displayAvatarURL(),
      })
      .setTimestamp();

    return embed;
  }

  createQueueEmbed(songs, bot) {
    if (!songs || songs.length === 0) {
      return new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ No Songs in Queue")
        .setDescription("The queue is empty. Use `/play` to add songs!");
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("📋 Music Queue")
      .setDescription(`**${songs.length} songs** in queue`);

    // Show current song (first in array)
    if (songs.length > 0) {
      const currentSong = songs[0];
      embed.addFields({
        name: "🎵 Now Playing",
        value: `**${currentSong.name}** - ${currentSong.uploader.name}\n⏱️ ${this.formatDuration(currentSong.duration)}`,
        inline: false,
      });
    }

    // Show next 10 songs
    const upcomingSongs = songs.slice(1, 11);
    if (upcomingSongs.length > 0) {
      const songList = upcomingSongs
        .map((song, index) => {
          const duration = this.formatDuration(song.duration);
          return `**${index + 1}.** ${song.name} - ${song.uploader.name} (${duration})`;
        })
        .join("\n");

      embed.addFields({
        name: "⏭️ Up Next",
        value: songList,
        inline: false,
      });
    }

    if (songs.length > 11) {
      embed.addFields({
        name: "📄 And more...",
        value: `+${songs.length - 11} more songs`,
        inline: false,
      });
    }

    embed.setFooter({
      text: `Total duration: ${this.calculateTotalDuration(songs)}`,
    });

    return embed;
  }

  formatDuration(seconds) {
    if (!seconds) return "Unknown";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  calculateTotalDuration(songs) {
    const totalSeconds = songs.reduce((total, song) => total + (song.duration || 0), 0);
    return this.formatDuration(totalSeconds);
  }

  createErrorEmbed(message) {
    return new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("❌ Error")
      .setDescription(message)
      .setTimestamp();
  }

  createSuccessEmbed(message) {
    return new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("✅ Success")
      .setDescription(message)
      .setTimestamp();
  }

  createWarningEmbed(message, title = "⚠️ Warning") {
    return new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp();
  }

  createBusyEmbed(activeBots) {
    return new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle("🔄 Bot Busy")
      .setDescription(
        `All music bots are currently busy (${activeBots}). Please wait for one to become available.`
      )
      .setTimestamp();
  }

  createConversionEmbed(from, to) {
    return new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🔄 Converting URL")
      .setDescription(`Converting ${from} URL to ${to}...`)
      .setTimestamp();
  }

  createControlButtons(queue = null) {
    const isPaused = queue ? queue.paused : false;
    const isAutoplay = queue ? queue.autoplay : false;
    const isLoop = queue ? queue.repeatMode === 2 : false;

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("play_pause")
        .setLabel(isPaused ? "▶️ Resume" : "⏸️ Pause")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("skip")
        .setLabel("⏭️ Skip")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("⏹️ Stop")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("queue")
        .setLabel("📋 Queue")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("loop")
        .setLabel(isLoop ? "🔁 Looping" : "🔁 Loop")
        .setStyle(isLoop ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("volume_down")
        .setLabel("🔉 -10")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("volume_up")
        .setLabel("🔊 +10")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("shuffle")
        .setLabel("🔀 Shuffle")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("autoplay")
        .setLabel(isAutoplay ? "🔄 Auto ON" : "🔄 Auto OFF")
        .setStyle(isAutoplay ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("leave")
        .setLabel("🚪 Leave")
        .setStyle(ButtonStyle.Danger)
    );

    return [row1, row2];
  }
}

export const embedBuilder = new EmbedBuilderClass();
export default embedBuilder;

export const commands = {
  play: {
    name: "play",
    description: "Play music from various sources (YouTube, Spotify, etc.)",
    aliases: ["p", "music", "stream"],
    options: [
      {
        name: "query",
        description: "Song name, artist, or URL to play",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  help: {
    name: "help",
    description: "Show available music commands",
    aliases: ["h", "commands", "info"],
    options: [
      {
        name: "category",
        description: "Category to show help for",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "Music Commands", value: "music" },
          { name: "All Commands", value: "all" },
        ],
      },
    ],
  },
  skip: {
    name: "skip",
    description: "Skip the current song",
    aliases: ["s", "next", "forward"],
  },
  stop: {
    name: "stop",
    description: "Stop playback and clear the queue",
    aliases: ["halt", "end", "clear"],
  },
  pause: {
    name: "pause",
    description: "Pause the current song",
    aliases: ["break", "hold"],
  },
  resume: {
    name: "resume",
    description: "Resume the paused song",
    aliases: ["continue", "unpause", "go"],
  },
  volume: {
    name: "volume",
    description: "Adjust the playback volume",
    aliases: ["vol", "v"],
    options: [
      {
        name: "level",
        description: "Volume level (1-100)",
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 100,
      },
    ],
  },
  queue: {
    name: "queue",
    description: "Show the current music queue",
    aliases: ["q", "list", "playlist"],
  },
  disconnect: {
    name: "disconnect",
    description: "Disconnect the bot from voice channel",
    aliases: ["dc", "leave", "bye"],
  },
  nowplaying: {
    name: "nowplaying",
    description: "Show information about the current song",
    aliases: ["np", "current", "song"],
  },
  autoplay: {
    name: "autoplay",
    description: "Toggle auto-playlist feature",
    aliases: ["auto", "ap", "continue"],
    options: [
      {
        name: "state",
        description: "Turn autoplay on or off",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "On", value: "on" },
          { name: "Off", value: "off" },
        ],
      },
    ],
  },
};

export const commandCategories = {
  music: [
    "play",
    "skip",
    "stop",
    "pause",
    "resume",
    "volume",
    "queue",
    "disconnect",
    "nowplaying",
    "autoplay",
  ],
  utility: ["help"],
};

# 🎵 Den Music Bot

A powerful Discord music streaming bot with multi-token support, designed for zero-cost deployment on Render's free tier.

## ✨ Features

### 🎵 Music Streaming
- **Multi-source support**: YouTube, YouTube Music, Spotify (converts to YouTube)
- **High-quality streaming**: Direct streaming without downloads
- **Smart search**: Song names, artist names, or direct URLs
- **Auto-playlist**: Automatically queues similar songs after each track

### 🤖 Multi-Bot System
- **Concurrent playback**: Multiple bot tokens for simultaneous voice channels
- **Smart assignment**: Automatic bot allocation to voice channels
- **Load balancing**: Distributes load across available bots
- **Independent queues**: Each server maintains its own music queue

### 🎛️ Interactive Controls
- **Rich embeds**: Beautiful music displays with album art
- **Control buttons**: Volume, skip, queue, stop, and more
- **Real-time updates**: Live embed updates with current song info
- **Universal access**: All server members can use control buttons

### ⚙️ Smart Features
- **Auto-disconnect**: Leaves empty voice channels after 5 minutes
- **Genre switching**: Intelligent queue management when switching songs
- **Volume persistence**: Remembers volume settings per server
- **Error handling**: Robust error recovery and user feedback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Discord Bot Token(s)
- Render account (free tier)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd den-music
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your bot tokens
```

4. **Deploy slash commands**
```bash
npm run deploy-commands
```

5. **Start the bot**
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```env
# Discord Bot Tokens (comma-separated for multiple bots)
BOT_TOKENS=your_token_1,your_token_2,your_token_3

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Multi-Bot Setup

1. Create multiple Discord applications at https://discord.com/developers/applications
2. Add all bot tokens to `BOT_TOKENS` (comma-separated)
3. Invite all bots to your servers with the same permissions
4. The system automatically manages bot assignment

### Bot Permissions Required
- `Connect` - Join voice channels
- `Speak` - Play audio
- `Use Slash Commands` - Command interactions
- `Send Messages` - Send responses
- `Embed Links` - Rich embeds
- `Read Message History` - Button interactions

## 🎵 Commands

### Music Commands
- `/play <song/url>` - Play music from various sources
- `/skip` - Skip current song
- `/stop` - Stop playback and clear queue
- `/pause` - Pause current song  
- `/resume` - Resume paused song
- `/volume [1-100]` - Adjust volume
- `/queue` - Show current queue
- `/nowplaying` - Show current song info
- `/disconnect` - Leave voice channel
- `/autoplay [on/off]` - Toggle auto-playlist

### Utility Commands
- `/help` - Show available commands

## 🎛️ Interactive Controls

Music embeds include buttons for:
- 🔉/🔊 Volume down/up
- ⏭️ Skip song
- 📋 Show queue
- ⏹️ Stop playback
- 🔄 Toggle auto-play
- 🔀 Shuffle queue
- 🔁 Loop (coming soon)
- 🚪 Disconnect

## 🌐 Supported Sources

- **YouTube**: Direct video URLs and searches
- **YouTube Music**: Prioritized for music content  
- **Spotify**: Automatically converts to YouTube
- **Search queries**: "Artist - Song", "Song name", etc.

## 📦 Deployment

### Render Deployment

1. **Fork this repository**
2. **Connect to Render**
   - Create new Web Service
   - Connect your GitHub repository
   - Choose "den-music" folder if in monorepo

3. **Configure Build & Deploy**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables**
   - Add `BOT_TOKENS` with your comma-separated tokens
   - Set `NODE_ENV=production`

5. **Deploy**
   - Render will automatically deploy and provide a URL
   - Use the `/health` endpoint to monitor bot status

### Resource Optimization
- Designed for Render's 750 hour/month free tier
- Efficient memory usage with stream-only approach
- Auto-cleanup of completed songs
- Health check endpoint for uptime monitoring

## 🛠️ Development

### Project Structure
```
den-music/
├── commands/           # Slash command implementations
├── config/            # Command configurations
├── utils/             # Core utilities (bot manager, music player, etc.)
├── scripts/           # Deployment and utility scripts
├── data/              # JSON storage for settings
└── index.js           # Main application entry point
```

### Scripts
- `npm run dev` - Development with auto-reload
- `npm run deploy-commands` - Deploy slash commands to Discord
- `npm run generate-help` - Auto-generate help command from config

### Adding New Commands

1. **Add to config**
```javascript
// config/commands.js
export const commands = {
  newcommand: {
    name: 'newcommand',
    description: 'Description here',
    aliases: ['alias1', 'alias2']
  }
};
```

2. **Create command file**
```javascript
// commands/newcommand.js
export const newcommandCommand = {
  data: { /* Discord API command data */ },
  async execute(interaction, bot) {
    // Implementation
  }
};
```

3. **Register in main index**
```javascript
// index.js
import { newcommandCommand } from './commands/newcommand.js';
commands.set('newcommand', newcommandCommand);
```

4. **Deploy**
```bash
npm run deploy-commands
```

## 🐛 Troubleshooting

### Common Issues

**Bot not responding to commands**
- Ensure bot has proper permissions
- Check if slash commands are deployed
- Verify bot token is correct

**Audio not playing**
- Confirm bot can connect to voice channel
- Check voice channel permissions
- Verify ffmpeg installation

**"All bots busy" message**
- Add more bot tokens to handle concurrent usage
- Check if bots are stuck in voice channels

**Memory issues on Render**
- Monitor `/health` endpoint
- Reduce auto-playlist queue size if needed
- Ensure proper cleanup is happening

### Debug Mode
Set `DEBUG=true` in environment for verbose logging.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)  
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🆘 Support

- Create issues for bugs or feature requests
- Join our Discord server (link in repository)
- Check the troubleshooting section above

---

**Den Music** - Bringing quality music streaming to Discord with zero cost! 🎵
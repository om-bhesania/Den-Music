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
npm run deploy
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
# Discord Bot Tokens (one per bot)
BOT_TOKEN_1=your_token_1
BOT_TOKEN_2=your_token_2
BOT_TOKEN_3=your_token_3

# Discord Bot Client IDs (required for command registration)
BOT_CLIENT_ID_1=your_client_id_1
BOT_CLIENT_ID_2=your_client_id_2
BOT_CLIENT_ID_3=your_client_id_3

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Multi-Bot Setup

1. Create multiple Discord applications at https://discord.com/developers/applications
2. Add all bot tokens to environment variables (BOT_TOKEN_1, BOT_TOKEN_2, etc.)
3. Add all client IDs to environment variables (BOT_CLIENT_ID_1, BOT_CLIENT_ID_2, etc.)
4. Invite all bots to your servers with the same permissions
5. The system automatically manages bot assignment

### Bot Permissions Required
- `Connect` - Join voice channels
- `Speak` - Play audio
- `Use Slash Commands` - Command interactions
- `Send Messages` - Send responses
- `Embed Links` - Rich embeds
- `Read Message History` - Button interactions

## 🚀 Deployment

### Render Deployment

1. **Fork this repository**
2. **Connect to Render**
   - Create new Web Service
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `node index.js`

3. **Configure Environment Variables**
   - Add all your bot tokens (BOT_TOKEN_1, BOT_TOKEN_2, etc.)
   - Add all your client IDs (BOT_CLIENT_ID_1, BOT_CLIENT_ID_2, etc.)
   - Set NODE_ENV=production

4. **Deploy**
   - Render will automatically deploy your bot
   - The health check endpoint will be available at your domain

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your bot tokens

# Deploy commands
npm run deploy

# Start development server
npm run dev
```

## 📁 Project Structure

```
den-music/
├── index.js              # Main application entry point
├── deploy-commands.js    # Command deployment script
├── commands/             # Slash command implementations
├── utils/                # Utility modules
│   ├── disTubePlayer.js  # Music player implementation
│   ├── botCoordinator.js # Multi-bot coordination
│   ├── embedBuilder.js   # Rich embed creation
│   └── botManager.js     # Bot management utilities
├── config/               # Configuration files
└── data/                 # Persistent data storage
```

## 🎵 Commands

- `/play <song>` - Play a song or add to queue
- `/skip` - Skip current song
- `/stop` - Stop playback and clear queue
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/volume <level>` - Set volume (0-100)
- `/queue` - Show current queue
- `/nowplaying` - Show current song info
- `/disconnect` - Disconnect from voice channel
- `/autoplay` - Toggle autoplay mode
- `/stats` - Show bot statistics
- `/help` - Show help information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
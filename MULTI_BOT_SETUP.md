# Multi-Bot Setup Guide

## Overview
This bot now supports running multiple Discord bot instances simultaneously. Each bot has its own DisTube player instance and can handle music commands independently.

## Environment Setup

### 1. Create Multiple Discord Bots
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create multiple applications (one for each bot)
3. For each application:
   - Go to the "Bot" section
   - Create a bot user
   - Copy the bot token
   - Enable the required intents:
     - Message Content Intent
     - Server Members Intent
     - Presence Intent

### 2. Configure Environment Variables
Create a `.env` file in your project root:

```env
# Bot Tokens (comma-separated)
BOT_TOKENS=token1,token2,token3

# Optional: Port for health check server
PORT=3000
```

**Important**: Replace `token1,token2,token3` with your actual bot tokens, separated by commas.

### 3. Deploy Commands for All Bots
Run the command deployment script to register slash commands for all bots:

```bash
node deploy-commands.js
```

This will deploy commands for all bots in your `BOT_TOKENS` environment variable.

### 4. Start the Multi-Bot System
```bash
npm run start
```

## Features

### Multi-Bot Architecture
- **Independent Instances**: Each bot runs with its own DisTube player
- **Load Distribution**: Commands are distributed across all available bots
- **Fault Tolerance**: If one bot goes offline, others continue working
- **Shared Commands**: All bots have access to the same music commands

### Bot Management
- **Automatic Startup**: All bots start simultaneously
- **Status Monitoring**: Console shows status for each bot
- **Error Handling**: Individual bot errors don't affect others

### Music Features
- **Volume Controls**: Volume up/down buttons (+10/-10)
- **Play/Pause**: Dynamic button that changes based on state
- **Skip, Stop, Queue**: Standard playback controls
- **Loop**: Toggle loop with visual feedback
- **Shuffle**: Randomize queue order
- **Autoplay**: Smart autoplay (enabled for multiple songs)
- **Leave**: Disconnect from voice channel

### Smart Autoplay Logic
- **Multiple Songs**: Autoplay automatically enabled when queue has multiple songs
- **Single Song**: Autoplay disabled for single songs
- **Inactivity Timer**: Bot leaves voice channel after 1 minute of inactivity

## Console Output
When running, you'll see output like:
```
🤖 Initializing 3 bot(s)...
🚀 Bot 1 login successful
🚀 Bot 2 login successful
🚀 Bot 3 login successful
✅ All 3 bots started successfully!
🎵 Bot 1: Den Music#1234 is ready!
🎵 Bot 2: Den Music#5678 is ready!
🎵 Bot 3: Den Music#9012 is ready!
```

## Troubleshooting

### Common Issues

1. **Only one bot online**
   - Check that all tokens are valid
   - Ensure tokens are comma-separated in .env
   - Verify all bots have proper permissions

2. **Commands not working**
   - Run `node deploy-commands.js` to deploy commands for all bots
   - Wait a few minutes for Discord to register the commands

3. **Bot not joining voice channels**
   - Check that bots have "Connect" and "Speak" permissions
   - Verify voice channel permissions

### Debug Mode
To see more detailed logs, you can add debug logging by modifying the console.log statements in the code.

## Advanced Configuration

### Load Balancing
The current implementation uses a simple round-robin distribution. You can modify the `getBotByGuildId` method in `index.js` to implement more sophisticated load balancing based on:
- Guild member count
- Bot activity levels
- Voice channel usage

### Custom Bot Names
Each bot can have a different name and avatar by configuring them in the Discord Developer Portal.

## Support
If you encounter issues:
1. Check the console output for error messages
2. Verify your environment variables are correct
3. Ensure all bots have proper Discord permissions
4. Check that commands are deployed for all bots 
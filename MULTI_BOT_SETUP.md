# Multi-Bot Music System Setup Guide

This guide will help you set up a multi-bot music system where each bot token acts as an independent music bot.

## Prerequisites

1. **Multiple Discord Bot Applications**: You need to create multiple Discord applications in the Discord Developer Portal
2. **Node.js**: Version 16 or higher
3. **Discord.js**: Version 14 or higher

## Step 1: Create Discord Bot Applications

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create multiple applications (one for each bot)
3. For each application:
   - Go to the "Bot" section
   - Create a bot user
   - Copy the **Token** and **Application ID**
   - Enable the following intents:
     - Server Members Intent
     - Message Content Intent
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot` and `applications.commands`
   - Select permissions: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`, `Use Voice Activity`
   - Copy the generated invite URL

## Step 2: Configure Environment Variables

Create a `.env` file in your project root:

```env
# Discord Bot Configuration
BOT_TOKENS=your_bot_token_1,your_bot_token_2,your_bot_token_3
BOT_CLIENT_IDS=your_client_id_1,your_client_id_2,your_client_id_3

# Optional: Test Guild ID for faster command updates during development
TEST_GUILD_ID=your_test_guild_id

# Server Configuration
PORT=3002
```

**Important**: 
- The number of tokens must match the number of client IDs
- Each token corresponds to a different Discord application
- The `TEST_GUILD_ID` is optional but recommended for faster command updates during development

## Step 3: Register Slash Commands

Run the command registration script to register slash commands for all bots:

```bash
node registerCommands.js
```

This will register all slash commands for each bot application. You should see output like:
```
🤖 Registering slash commands for 2 bot(s)...
📝 Registering commands for Bot 1 (Client ID: 123456789)...
✅ Registered 12 commands for Bot 1 in guild 987654321
📝 Registering commands for Bot 2 (Client ID: 987654321)...
✅ Registered 12 commands for Bot 2 in guild 987654321
🎉 Command registration complete!
```

## Step 4: Invite Bots to Your Server

1. Use the invite URLs you generated in Step 1 to invite all bots to your server
2. Make sure each bot has the necessary permissions
3. You should see multiple bots in your server's member list

## Step 5: Start the Multi-Bot System

```bash
node index.js
```

You should see output like:
```
🤖 Initializing 2 independent bot(s)...
🌐 Health check server running on port 3002
🚀 Bot 1 login successful
🎵 Bot 1: Den Music#1154 is ready!
🎧 DisTube music player initialized for Bot 1
🔄 Bot 1 status: online
🚀 Bot 2 login successful
🎵 Bot 2: Den Music 2#3132 is ready!
🎧 DisTube music player initialized for Bot 2
🔄 Bot 2 status: online
✅ All 2 independent bots started successfully!
🎯 Independent bot system ready! Each token acts as a separate bot.
```

## How It Works

### Independent Bot Architecture
- **Each bot is completely independent**: Each token represents a separate Discord application
- **Each bot has its own queue**: No shared state between bots
- **Each bot can join one voice channel**: Discord limitation
- **Commands are bot-specific**: `/play` with Bot 1 only affects Bot 1's queue

### User Experience
1. **Multiple bots available**: Users see multiple bots in the server
2. **Bot-specific commands**: Each bot responds to its own commands
3. **Independent queues**: Each bot manages its own music queue
4. **No cross-bot interference**: Bots don't interfere with each other

### Available Commands
Each bot supports these commands:
- `/play` - Play a song or playlist
- `/skip` - Skip the current song
- `/stop` - Stop playback and clear queue
- `/pause` - Pause playback
- `/resume` - Resume playback
- `/volume` - Adjust volume
- `/queue` - Show current queue
- `/nowplaying` - Show currently playing song
- `/help` - Show help information
- `/disconnect` - Disconnect from voice channel
- `/autoplay` - Toggle autoplay
- `/stats` - Show bot statistics

## Troubleshooting

### Common Issues

1. **"Command not found" errors**
   - Make sure you ran `node registerCommands.js`
   - Check that all client IDs are correct
   - Verify that bots have the `applications.commands` scope

2. **"Bot not responding"**
   - Check that all tokens are valid
   - Verify that bots are online in the console
   - Make sure bots have the necessary permissions

3. **"Cannot join voice channel"**
   - Check that bots have `Connect` and `Speak` permissions
   - Verify that the voice channel exists and is accessible

4. **"Port already in use"**
   - Change the `PORT` in your `.env` file
   - Or kill the process using the current port

### Debugging Tips

1. **Check bot status**: Use `/stats` to see which bots are online
2. **Console logs**: Watch the console for detailed logging
3. **Discord Developer Portal**: Verify bot applications and permissions
4. **Test with one bot first**: Start with a single bot to verify setup

## Advanced Configuration

### Customizing Bot Behavior
- Edit `utils/disTubePlayer.js` to modify music playback behavior
- Edit `utils/embedBuilder.js` to customize message appearance
- Edit individual command files to modify command behavior

### Adding More Bots
1. Create a new Discord application
2. Add the token and client ID to your `.env` file
3. Run `node registerCommands.js` to register commands
4. Invite the new bot to your server
5. Restart the application

### Production Deployment
- Use environment variables for all sensitive data
- Set up proper logging
- Consider using a process manager like PM2
- Set up monitoring for bot health

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify your `.env` configuration
3. Ensure all bots have proper permissions
4. Test with a single bot first

## Features

- ✅ **Multi-bot support**: Each token acts as an independent bot
- ✅ **Independent queues**: Each bot manages its own music queue
- ✅ **Full music features**: Play, pause, skip, volume, queue management
- ✅ **Button controls**: Interactive buttons for music control
- ✅ **Auto-leave**: Bots automatically leave empty voice channels
- ✅ **Health monitoring**: Built-in health check endpoint
- ✅ **Statistics**: `/stats` command to monitor bot usage 
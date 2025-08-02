# Process-Based Multi-Bot Music System

This guide explains how to set up a **true multi-bot architecture** using separate processes for each bot. This approach provides complete independence between bots and eliminates all cross-bot interference.

## 🎯 Why Process-Based Multi-Bot?

### **Benefits**
- ✅ **True independence**: Each bot runs in its own process
- ✅ **No shared state**: No cross-bot interference
- ✅ **Better resource management**: Each bot has its own memory space
- ✅ **Easier scaling**: Add/remove bots without affecting others
- ✅ **Better error isolation**: One bot crashing doesn't affect others
- ✅ **Production ready**: PM2 support for production deployment

### **Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Bot Process 1 │    │   Bot Process 2 │    │   Bot Process 3 │
│   (Token 1)     │    │   (Token 2)     │    │   (Token 3)     │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Discord.js   │ │    │ │Discord.js   │ │    │ │Discord.js   │ │
│ │Client 1     │ │    │ │Client 2     │ │    │ │Client 3     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │DisTube 1    │ │    │ │DisTube 2    │ │    │ │DisTube 3    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Setup Instructions

### **Step 1: Create Discord Bot Applications**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create multiple applications (one for each bot)
3. For each application:
   - Go to "Bot" section → Create bot user
   - Copy the **Token** and **Application ID**
   - Enable required intents
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot` and `applications.commands`
   - Select permissions: `Send Messages`, `Use Slash Commands`, `Connect`, `Speak`
   - Copy the generated invite URL

### **Step 2: Configure Environment Variables**

Create a `.env` file:

```env
# Discord Bot Configuration (Process-Based Multi-Bot)
BOT_TOKEN_1=your_bot_token_1
BOT_TOKEN_2=your_bot_token_2
BOT_TOKEN_3=your_bot_token_3

# Discord Bot Client IDs
BOT_CLIENT_ID_1=your_client_id_1
BOT_CLIENT_ID_2=your_client_id_2
BOT_CLIENT_ID_3=your_client_id_3

# Optional: Test Guild ID for faster command updates
TEST_GUILD_ID=your_test_guild_id

# Server Configuration
PORT=3002
```

### **Step 3: Register Slash Commands**

```bash
node registerCommands.js
```

This registers commands for all bots simultaneously.

### **Step 4: Start the Multi-Bot System**

#### **Option A: Development (Simple Process Manager)**
```bash
node processManager.js
```

#### **Option B: Production (PM2)**
```bash
# Install PM2 globally
npm install -g pm2

# Start all bots
pm2 start ecosystem.config.js

# Monitor bots
pm2 status
pm2 logs

# Stop all bots
pm2 stop all
```

## 🚀 How It Works

### **Process Independence**
- Each bot runs in its own Node.js process
- Each bot has its own Discord.js client
- Each bot has its own DisTube player
- No shared memory or state between bots

### **Command Handling**
```
User uses /play → Discord routes to specific bot → That bot handles it
Each bot only responds to commands sent to it
No redirection or handoff between bots
```

### **Voice Channel Management**
- Each bot can join one voice channel per guild
- Each bot manages its own queue independently
- No cross-bot voice channel switching

## 📊 Expected Behavior

### **Console Output**
```
🤖 Starting 3 independent bot processes...
🚀 Spawning Bot 1...
🚀 Spawning Bot 2...
🚀 Spawning Bot 3...
✅ All 3 bot processes started
📊 Active bots: 3

[Bot 1] 🎵 Bot 1: Den Music#1154 is ready!
[Bot 2] 🎵 Bot 2: Den Music 2#3132 is ready!
[Bot 3] 🎵 Bot 3: Den Music 3#4567 is ready!

[Bot 1] 🎵 Bot 1 (Den Music) handling command: play
[Bot 1] 🤖 Bot Den Music assigned to voice channel VC1
[Bot 2] 🎵 Bot 2 (Den Music 2) handling command: play
[Bot 2] 🤖 Bot Den Music 2 assigned to voice channel VC2
```

### **User Experience**
- Users see multiple bots in the server
- Each bot responds to its own commands
- No confusion about which bot to use
- Clear separation of responsibilities

## 🔧 Management Commands

### **Development (processManager.js)**
```bash
# Start all bots
node processManager.js

# Stop all bots
Ctrl+C
```

### **Production (PM2)**
```bash
# Start all bots
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Restart all bots
pm2 restart all

# Stop all bots
pm2 stop all

# Delete all bots
pm2 delete all
```

## 📁 File Structure

```
├── bot.js                    # Single bot process
├── processManager.js         # Development process manager
├── ecosystem.config.js       # PM2 production configuration
├── registerCommands.js       # Command registration script
├── commands/                 # Slash commands
├── utils/                    # Utilities (DisTube, embeds)
├── logs/                     # Log files (created automatically)
└── .env                      # Environment variables
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **"No bot tokens found"**
   - Check your `.env` file format
   - Ensure tokens are set as `BOT_TOKEN_1`, `BOT_TOKEN_2`, etc.

2. **"Command not found"**
   - Run `node registerCommands.js` to register commands
   - Check that all client IDs are correct

3. **"Bot not responding"**
   - Check console logs for each bot process
   - Verify bot permissions in Discord

4. **"Port already in use"**
   - Change the `PORT` in your `.env` file
   - Or kill the process using the current port

### **Debugging Tips**

1. **Check individual bot logs**:
   - Development: Watch console output for `[Bot X]` prefixes
   - Production: `pm2 logs music-bot-1`

2. **Monitor bot status**:
   - Development: Status logged every 30 seconds
   - Production: `pm2 status`

3. **Test individual bots**:
   ```bash
   BOT_TOKEN=your_token BOT_ID=1 node bot.js
   ```

## 🎵 Features

- ✅ **True multi-bot**: Each bot is completely independent
- ✅ **Independent queues**: Each bot manages its own music queue
- ✅ **Full music features**: Play, pause, skip, volume, queue management
- ✅ **Button controls**: Interactive buttons for music control
- ✅ **Auto-leave**: Bots automatically leave empty voice channels
- ✅ **Process management**: Automatic restart on crashes
- ✅ **Production ready**: PM2 support for production deployment

## 🚀 Scaling

### **Adding More Bots**
1. Create new Discord application
2. Add `BOT_TOKEN_4` and `BOT_CLIENT_ID_4` to `.env`
3. Run `node registerCommands.js`
4. Restart the process manager

### **Production Deployment**
- Use PM2 for process management
- Set up monitoring and logging
- Configure auto-restart policies
- Use environment variables for all configuration

This process-based approach provides the **true independence** you were looking for! 🎉 
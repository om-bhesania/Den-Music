import { spawn } from 'child_process';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

class BotProcessManager {
  constructor() {
    this.bots = new Map();
    this.tokens = this.getBotTokens();
    this.createLogsDirectory();
  }

  getBotTokens() {
    // Dynamically find all bot tokens (supports unlimited bots)
    const tokens = [];
    let botIndex = 1;
    
    while (true) {
      const token = process.env[`BOT_TOKEN_${botIndex}`];
      const clientId = process.env[`BOT_CLIENT_ID_${botIndex}`];
      
      if (!token || !clientId) {
        break; // Stop when we don't find a token or client ID
      }
      
      tokens.push({ 
        id: botIndex, 
        token, 
        clientId 
      });
      botIndex++;
    }
    
    if (tokens.length === 0) {
      console.error("❌ No bot tokens found in environment variables");
      console.error("Please set BOT_TOKEN_1, BOT_TOKEN_2, etc. and BOT_CLIENT_ID_1, BOT_CLIENT_ID_2, etc. in your .env file");
      console.error("Example:");
      console.error("BOT_TOKEN_1=your_token_1");
      console.error("BOT_CLIENT_ID_1=your_client_id_1");
      console.error("BOT_TOKEN_2=your_token_2");
      console.error("BOT_CLIENT_ID_2=your_client_id_2");
      process.exit(1);
    }
    
    console.log(`🔍 Found ${tokens.length} bot(s) in environment variables`);
    tokens.forEach(({ id, token, clientId }) => {
      console.log(`   Bot ${id}: Token ${token.substring(0, 10)}..., Client ID: ${clientId}`);
    });
    
    return tokens;
  }

  createLogsDirectory() {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  spawnBot(botId, token) {
    console.log(`🚀 Spawning Bot ${botId}...`);
    
    const botProcess = spawn('node', ['bot.js'], {
      env: { 
        ...process.env, 
        BOT_TOKEN: token,
        BOT_ID: botId.toString()
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle stdout
    botProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Bot ${botId}] ${output}`);
      }
    });

    // Handle stderr
    botProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.error(`[Bot ${botId} ERROR] ${error}`);
      }
    });

    // Handle process exit
    botProcess.on('exit', (code) => {
      console.log(`🔌 Bot ${botId} process exited with code ${code}`);
      this.bots.delete(botId);
      
      // Restart the bot after 5 seconds
      setTimeout(() => {
        console.log(`🔄 Restarting Bot ${botId}...`);
        this.spawnBot(botId, token);
      }, 5000);
    });

    // Handle process errors
    botProcess.on('error', (error) => {
      console.error(`❌ Bot ${botId} process error:`, error);
    });

    this.bots.set(botId, botProcess);
    return botProcess;
  }

  startAllBots() {
    console.log(`🤖 Starting ${this.tokens.length} independent bot processes...`);
    
    this.tokens.forEach(({ id, token }) => {
      this.spawnBot(id, token);
    });

    console.log(`✅ All ${this.tokens.length} bot processes started`);
    console.log(`📊 Active bots: ${this.bots.size}`);
  }

  stopAllBots() {
    console.log(`🛑 Stopping all bot processes...`);
    
    this.bots.forEach((process, botId) => {
      console.log(`🛑 Stopping Bot ${botId}...`);
      process.kill('SIGTERM');
    });
    
    this.bots.clear();
    console.log(`✅ All bot processes stopped`);
  }

  getStatus() {
    const status = {
      totalBots: this.tokens.length,
      activeBots: this.bots.size,
      bots: []
    };

    this.bots.forEach((process, botId) => {
      status.bots.push({
        id: botId,
        pid: process.pid,
        alive: !process.killed
      });
    });

    return status;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  if (processManager) {
    processManager.stopAllBots();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  if (processManager) {
    processManager.stopAllBots();
  }
  process.exit(0);
});

// Start the process manager
const processManager = new BotProcessManager();
processManager.startAllBots();

// Log status every 30 seconds
setInterval(() => {
  const status = processManager.getStatus();
  console.log(`📊 Status: ${status.activeBots}/${status.totalBots} bots active`);
}, 30000); 
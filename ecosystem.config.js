const { config } = require('dotenv');

// Load environment variables
config();

// Dynamic bot detection - supports unlimited bots
const getBots = () => {
  const bots = [];
  let botIndex = 1;
  
  // Dynamically find all bots (supports unlimited bots)
  while (true) {
    const token = process.env[`BOT_TOKEN_${botIndex}`];
    const clientId = process.env[`BOT_CLIENT_ID_${botIndex}`];
    
    if (!token || !clientId) {
      break; // Stop when we don't find a token or client ID
    }
    
    bots.push({ 
      id: botIndex, 
      token, 
      clientId 
    });
    botIndex++;
  }
  
  if (bots.length === 0) {
    console.error("❌ No bot tokens found in environment variables");
    console.error("Please set BOT_TOKEN_1, BOT_TOKEN_2, etc. and BOT_CLIENT_ID_1, BOT_CLIENT_ID_2, etc. in your .env file");
    process.exit(1);
  }
  
  console.log(`🔍 Found ${bots.length} bot(s) for PM2 configuration`);
  return bots;
};

const bots = getBots();

// Dynamically generate PM2 apps configuration
const apps = bots.map(({ id, token }) => ({
  name: `music-bot-${id}`,
  script: 'bot.js',
  env: {
    BOT_TOKEN: token,
    BOT_ID: id.toString(),
    NODE_ENV: 'production'
  },
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '1G',
  error_file: `./logs/bot-${id}-error.log`,
  out_file: `./logs/bot-${id}-out.log`,
  log_file: `./logs/bot-${id}-combined.log`,
  time: true
}));

module.exports = {
  apps
}; 
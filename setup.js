#!/usr/bin/env node

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

console.log('🎵 Multi-Bot Music System Setup\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📝 Creating .env file from template...');
  
  const envTemplate = `# Discord Bot Configuration (Process-Based Multi-Bot)
# Add your Discord bot tokens here (one per bot)
# Format: BOT_TOKEN_1=token1, BOT_TOKEN_2=token2, etc.
BOT_TOKEN_1=your_bot_token_1
BOT_TOKEN_2=your_bot_token_2
BOT_TOKEN_3=your_bot_token_3

# Discord Bot Client IDs (required for command registration)
# Add your Discord bot client IDs here (one per bot)
# Format: BOT_CLIENT_ID_1=clientid1, BOT_CLIENT_ID_2=clientid2, etc.
BOT_CLIENT_ID_1=your_client_id_1
BOT_CLIENT_ID_2=your_client_id_2
BOT_CLIENT_ID_3=your_client_id_3

# Optional: Test Guild ID for faster command updates during development
# Leave empty for global command registration
TEST_GUILD_ID=your_test_guild_id

# Server Configuration
PORT=3002
`;
  
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env file');
  console.log('📝 Please edit the .env file with your bot tokens and client IDs');
} else {
  console.log('✅ .env file found');
}

// Dynamic bot token detection - supports unlimited bots
const getBotTokens = () => {
  const tokens = [];
  let botIndex = 1;
  
  // Dynamically find all bot tokens (supports unlimited bots)
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
  
  return tokens;
};

const bots = getBotTokens();

console.log('\n📋 Current Configuration:');
console.log(`   Bots configured: ${bots.length}`);

if (bots.length === 0) {
  console.log('\n❌ No bot tokens found in .env file');
  console.log('📝 Please add your bot tokens using the new format:');
  console.log('   BOT_TOKEN_1=your_token_1');
  console.log('   BOT_CLIENT_ID_1=your_client_id_1');
  console.log('   BOT_TOKEN_2=your_token_2');
  console.log('   BOT_CLIENT_ID_2=your_client_id_2');
  console.log('   (and so on...)');
} else {
  console.log('\n✅ Configuration looks good!');
  console.log('\n🤖 Detected Bots:');
  bots.forEach(({ id, token, clientId }) => {
    console.log(`   Bot ${id}: Token ${token.substring(0, 10)}..., Client ID: ${clientId}`);
  });
  
  console.log('\n🚀 Next steps:');
  console.log('   1. Run: node registerCommands.js');
  console.log('   2. Invite all bots to your server');
  console.log('   3. Run: node index.js');
  console.log('\n🎯 Features:');
  console.log('   ✅ Dynamic bot detection (unlimited bots)');
  console.log('   ✅ Bot coordinator system');
  console.log('   ✅ Intelligent command routing');
  console.log('   ✅ Automatic bot selection');
  console.log('   ✅ Real-time voice channel coordination');
}

console.log('\n📖 For detailed setup instructions, see PROCESS_BASED_SETUP.md');

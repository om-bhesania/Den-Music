import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🤖 Den Music - Add New Bot Token');
console.log('==================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📁 Found existing .env file');
} else {
  console.log('📁 Creating new .env file');
  envContent = '# Discord Bot Tokens (comma-separated)\nBOT_TOKENS=\n\n# Optional: Port for health check server\nPORT=3000\n';
}

// Parse existing tokens
const tokenMatch = envContent.match(/BOT_TOKENS=(.*)/);
let existingTokens = [];

if (tokenMatch && tokenMatch[1].trim()) {
  existingTokens = tokenMatch[1].split(',').map(token => token.trim()).filter(token => token);
  console.log(`🔑 Found ${existingTokens.length} existing bot token(s)`);
} else {
  console.log('🔑 No existing tokens found');
}

// Get new token from user
console.log('\n📝 Enter the new bot token:');
console.log('(You can get this from Discord Developer Portal)');

// For demonstration, we'll show the format of the .env file

console.log('\n⚠️  Note: This script is for demonstration.');
console.log('📋 To add a new bot:');
console.log('1. Go to Discord Developer Portal');
console.log('2. Create a new application');
console.log('3. Go to Bot section and copy the token');
console.log('4. Add the token to your .env file like this:');
console.log('   BOT_TOKENS=token1,token2,new_token_here');

console.log('\n📊 Current system status:');
console.log(`• Total bots configured: ${existingTokens.length}`);
console.log(`• Add more tokens to scale automatically`);

console.log('\n🎯 Next steps:');
console.log('1. Add your new token to the .env file');
console.log('2. Run: node deploy-commands.js');
console.log('3. Restart the bot: npm run start');
console.log('4. Use /stats to see all bots');

console.log('\n✨ Your dynamic bot system is ready to scale!'); 
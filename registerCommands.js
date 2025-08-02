import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

// Import all commands
import playCommand from './commands/play.js';
import skipCommand from './commands/skip.js';
import stopCommand from './commands/stop.js';
import pauseCommand from './commands/pause.js';
import resumeCommand from './commands/resume.js';
import volumeCommand from './commands/volume.js';
import queueCommand from './commands/queue.js';
import nowPlayingCommand from './commands/nowPlaying.js';
import helpCommand from './commands/help.js';
import disconnectCommand from './commands/disconnect.js';
import autoplayCommand from './commands/autoplay.js';
import statsCommand from './commands/stats.js';

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
    console.error("Example:");
    console.error("BOT_TOKEN_1=your_token_1");
    console.error("BOT_CLIENT_ID_1=your_client_id_1");
    console.error("BOT_TOKEN_2=your_token_2");
    console.error("BOT_CLIENT_ID_2=your_client_id_2");
    process.exit(1);
  }
  
  console.log(`🔍 Found ${bots.length} bot(s) in environment variables`);
  bots.forEach(({ id, token, clientId }) => {
    console.log(`   Bot ${id}: Token ${token.substring(0, 10)}..., Client ID: ${clientId}`);
  });
  
  return bots;
};

const bots = getBots();
const guildId = process.env.TEST_GUILD_ID; // Optional: for faster command updates during development

// Define all commands
const commands = [
  playCommand.data.toJSON(),
  skipCommand.data.toJSON(),
  stopCommand.data.toJSON(),
  pauseCommand.data.toJSON(),
  resumeCommand.data.toJSON(),
  volumeCommand.data.toJSON(),
  queueCommand.data.toJSON(),
  nowPlayingCommand.data.toJSON(),
  helpCommand.data.toJSON(),
  disconnectCommand.data.toJSON(),
  autoplayCommand.data.toJSON(),
  statsCommand.data.toJSON(),
];

async function registerCommands() {
  console.log(`🤖 Registering slash commands for ${bots.length} bot(s)...`);
  
  for (const bot of bots) {
    const rest = new REST({ version: '10' }).setToken(bot.token);
    
    try {
      console.log(`📝 Registering commands for Bot ${bot.id} (Client ID: ${bot.clientId})...`);
      
      if (guildId) {
        // Register commands for a specific guild (faster for development)
        await rest.put(
          Routes.applicationGuildCommands(bot.clientId, guildId),
          { body: commands }
        );
        console.log(`✅ Registered ${commands.length} commands for Bot ${bot.id} in guild ${guildId}`);
      } else {
        // Register commands globally (slower, but works everywhere)
        await rest.put(
          Routes.applicationCommands(bot.clientId),
          { body: commands }
        );
        console.log(`✅ Registered ${commands.length} commands for Bot ${bot.id} globally`);
      }
    } catch (error) {
      console.error(`❌ Failed to register commands for Bot ${bot.id}:`, error);
      if (error.code === 50001) {
        console.error(`   Make sure Bot ${bot.id} has the 'applications.commands' scope when invited`);
      }
    }
  }
  
  console.log(`🎉 Command registration complete!`);
  console.log(`📋 Commands registered:`);
  commands.forEach(cmd => console.log(`   - /${cmd.name}: ${cmd.description}`));
}

registerCommands().catch(console.error); 
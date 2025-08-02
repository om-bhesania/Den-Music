import "dotenv/config";
import { REST, Routes } from "discord.js"; 
import { commands } from './config/commands.js';

const botTokens =
  process.env.BOT_TOKENS?.split(",").map((token) => token.trim()) || [];

if (botTokens.length === 0) {
  console.error("❌ BOT_TOKENS environment variable is required");
  process.exit(1);
}

// Convert commands config to Discord API format
const commandsArray = Object.values(commands).map((cmd) => ({
  name: cmd.name,
  description: cmd.description,
  options: cmd.options || [],
}));

async function deployCommandsForBot(token, botIndex) {
  try {
    const rest = new REST().setToken(token);

    // Get bot application ID
    const application = await rest.get(Routes.oauth2CurrentApplication());
    const applicationId = application.id;

    console.log(
      `🚀 Deploying ${commandsArray.length} commands for Bot ${botIndex + 1}...`
    );

    // Deploy commands globally
    const data = await rest.put(Routes.applicationCommands(applicationId), {
      body: commandsArray,
    });

    console.log(
      `✅ Successfully deployed ${data.length} commands for Bot ${botIndex + 1}`
    );
  } catch (error) {
    console.error(
      `❌ Failed to deploy commands for Bot ${botIndex + 1}:`,
      error
    );
  }
}

async function deployAllCommands() {
  console.log("🎵 Den Music - Command Deployment");
  console.log("================================");

  for (let i = 0; i < botTokens.length; i++) {
    await deployCommandsForBot(botTokens[i], i);
  }

  console.log("✅ Command deployment completed!");
}

deployAllCommands();

#!/usr/bin/env node

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

console.log("🎵 Den Music Bot Setup");
console.log("=====================\n");

async function setup() {
  try {
    // Create necessary directories
    if (!existsSync("./data")) {
      mkdirSync("./data", { recursive: true });
      console.log("✅ Created data directory");
    }

    if (!existsSync("./commands")) {
      mkdirSync("./commands", { recursive: true });
      console.log("✅ Created commands directory");
    }

    if (!existsSync("./config")) {
      mkdirSync("./config", { recursive: true });
      console.log("✅ Created config directory");
    }

    if (!existsSync("./utils")) {
      mkdirSync("./utils", { recursive: true });
      console.log("✅ Created utils directory");
    }

    if (!existsSync("./scripts")) {
      mkdirSync("./scripts", { recursive: true });
      console.log("✅ Created scripts directory");
    }

    // Check if .env exists
    if (!existsSync("./.env")) {
      console.log("\n📝 Setting up environment variables...");

      const tokens = await question(
        "Enter your Discord bot tokens (comma-separated): "
      );
      const port =
        (await question("Enter port number (default: 3000): ")) || "3000";

      const envContent = `# Discord Bot Tokens (comma-separated)
BOT_TOKENS=${tokens}

# Server Configuration
PORT=${port}
NODE_ENV=development

# Optional: Additional configuration
DEBUG=false`;

      writeFileSync("./.env", envContent);
      console.log("✅ Created .env file");
    }

    // Initialize empty settings file
    if (!existsSync("./data/server-settings.json")) {
      writeFileSync("./data/server-settings.json", "{}");
      console.log("✅ Created server settings file");
    }

    console.log("\n🚀 Setup completed! Next steps:");
    console.log("1. Install dependencies: npm install");
    console.log("2. Deploy commands: npm run deploy-commands");
    console.log("3. Start the bot: npm run dev");
    console.log("\n📖 Check README.md for detailed instructions");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  } finally {
    rl.close();
  }
}

setup();

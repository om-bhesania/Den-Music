#!/usr/bin/env node

import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function runCommand(command, description) {
  try {
    console.log(`📦 ${description}...`);
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

console.log("🎵 Den Music Bot - Installation & Setup");
console.log("=====================================\n");

async function install() {
  try {
    // Create necessary directories
    const directories = ["data", "commands", "config", "utils", "scripts"];
    directories.forEach((dir) => {
      if (!existsSync(`./${dir}`)) {
        mkdirSync(`./${dir}`, { recursive: true });
        console.log(`✅ Created ${dir} directory`);
      }
    });

    // Install dependencies with specific versions for compatibility
    console.log("\n📦 Installing dependencies...");

    const dependencies = [
      "discord.js@^14.14.1",
      "@discordjs/voice@^0.16.1",
      "express@^4.18.2",
      "dotenv@^16.3.1",
      "play-dl@^1.9.7",
      "youtube-sr@^4.3.12",
      "ytmusic-api@^5.0.2",
      "ytdl-core@^4.11.5",
      "yt-search@^2.13.1",
      "ffmpeg-static@^5.2.0",
      "sodium-native@^4.0.5",
    ];

    const devDependencies = ["nodemon@^3.0.2"];

    runCommand(
      `npm install ${dependencies.join(" ")}`,
      "Installing main dependencies"
    );
    runCommand(
      `npm install --save-dev ${devDependencies.join(" ")}`,
      "Installing dev dependencies"
    );

    // Setup environment variables
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

    // Test installation
    console.log("\n🧪 Testing installation...");
    try {
      // Test imports
      const testCode = `
        import YouTube from 'youtube-sr';
        import YTMusic from 'ytmusic-api';
        import { Client } from 'discord.js';
        console.log('✅ All packages imported successfully');
      `;
      writeFileSync("./test-install.mjs", testCode);
      execSync("node test-install.mjs", { stdio: "inherit" });
      execSync("rm test-install.mjs"); // Clean up
    } catch (error) {
      console.error(
        "⚠️ Some packages may have issues, but installation continued"
      );
    }

    console.log("\n🎉 Installation completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Deploy commands: npm run deploy-commands");
    console.log("2. Start the bot: npm run dev");
  } catch (error) {
    console.error("❌ Installation failed:", error.message);
    process.exit(1);
  }
}

install();

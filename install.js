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
    const directories = ["data", "commands", "config", "utils", "scripts", "logs"];
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
      "distube@^4.1.1",
      "@distube/spotify@^1.5.1",
      "@distube/soundcloud@^1.3.3",
      "@distube/yt-dlp@^1.1.4",
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

      const numBots = parseInt(await question("How many bots do you want to configure? (default: 2): ")) || 2;
      
      let envContent = `# Discord Bot Configuration (Process-Based Multi-Bot)
# Add your Discord bot tokens here (one per bot)
# Format: BOT_TOKEN_1=token1, BOT_TOKEN_2=token2, etc.\n`;

      // Add bot tokens
      for (let i = 1; i <= numBots; i++) {
        const token = await question(`Enter bot ${i} token: `);
        envContent += `BOT_TOKEN_${i}=${token}\n`;
      }

      envContent += `\n# Discord Bot Client IDs (required for command registration)
# Add your Discord bot client IDs here (one per bot)
# Format: BOT_CLIENT_ID_1=clientid1, BOT_CLIENT_ID_2=clientid2, etc.\n`;

      // Add client IDs
      for (let i = 1; i <= numBots; i++) {
        const clientId = await question(`Enter bot ${i} client ID: `);
        envContent += `BOT_CLIENT_ID_${i}=${clientId}\n`;
      }

      const testGuildId = await question("Enter test guild ID (optional, for faster command updates): ");
      const port = (await question("Enter port number (default: 3002): ")) || "3002";

      envContent += `\n# Optional: Test Guild ID for faster command updates during development
# Leave empty for global command registration
TEST_GUILD_ID=${testGuildId || ''}

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
        import { Client } from 'discord.js';
        import DisTube from 'distube';
        import { config } from 'dotenv';
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
    console.log("1. Run: node registerCommands.js");
    console.log("2. Invite all bots to your server");
    console.log("3. Run: node index.js");
    console.log("\n🎯 Features:");
    console.log("   ✅ Dynamic bot detection (unlimited bots)");
    console.log("   ✅ Bot coordinator system");
    console.log("   ✅ Intelligent command routing");
    console.log("   ✅ Automatic bot selection");
    console.log("   ✅ Real-time voice channel coordination");
    console.log("\n📖 For detailed setup instructions, see PROCESS_BASED_SETUP.md");
  } catch (error) {
    console.error("❌ Installation failed:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

install();

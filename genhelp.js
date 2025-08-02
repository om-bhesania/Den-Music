import { writeFileSync } from "fs";
import { commands, commandCategories } from "../config/commands.js";

function generateHelpCommand() {
  const musicCommands = commandCategories.music
    .map((cmdName) => {
      const cmd = commands[cmdName];
      const aliases = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : "";
      return `\`/${cmd.name}\`${aliases} - ${cmd.description}`;
    })
    .join("\n");

  const utilityCommands = commandCategories.utility
    .map((cmdName) => {
      const cmd = commands[cmdName];
      const aliases = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : "";
      return `\`/${cmd.name}\`${aliases} - ${cmd.description}`;
    })
    .join("\n");

  const helpCommandContent = `import embedBuilder from '../utils/embedBuilder.js';

export const helpCommand = {
  data: {
    name: 'help',
    description: 'Show available music commands',
    options: [
      {
        name: 'category',
        description: 'Category to show help for',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Music Commands', value: 'music' },
          { name: 'All Commands', value: 'all' }
        ]
      }
    ]
  },

  async execute(interaction, bot) {
    const category = interaction.options.getString('category') || 'all';
    
    let helpEmbed;
    
    if (category === 'music') {
      helpEmbed = embedBuilder.createMusicHelpEmbed(bot);
    } else {
      helpEmbed = embedBuilder.createHelpEmbed(bot);
    }
    
    await interaction.reply({
      embeds: [helpEmbed],
      flags: 64 // MessageFlags.Ephemeral
    });
  }
};

// Auto-generated command lists
export const musicCommandsList = \`${musicCommands}\`;
export const utilityCommandsList = \`${utilityCommands}\`;
`;

  return helpCommandContent;
}

function updateHelpCommand() {
  try {
    const newHelpContent = generateHelpCommand();
    writeFileSync("./commands/help.js", newHelpContent);
    console.log("✅ Help command updated successfully!");
    console.log("📝 Generated help content with:");
    console.log(`   - ${commandCategories.music.length} music commands`);
    console.log(`   - ${commandCategories.utility.length} utility commands`);
  } catch (error) {
    console.error("❌ Failed to update help command:", error);
  }
}

console.log("🎵 Den Music - Help Generator");
console.log("============================");
updateHelpCommand();

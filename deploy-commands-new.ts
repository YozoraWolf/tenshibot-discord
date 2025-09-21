import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
import { Client, GatewayIntentBits } from 'discord.js';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Read from environment variables
const guildId = process.env.SWM_ID!;
const token = process.env.BOT_TOKEN!;

if (!guildId || !token) {
  console.error('Missing required environment variables: SWM_ID, BOT_TOKEN');
  process.exit(1);
}

const commands: any[] = [];

// Grab all the command files from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`Found ${commandFiles.length} command files in JavaScript`);

// Dynamically import and process each command file
async function loadCommands() {
  for (const file of commandFiles) {
    try {
      const commandModule = await import(`./commands/${file}`);
      
      // Handle different export formats
      let commandData = null;
      
      if (commandModule.data) {
        // Direct export: export const data = ...
        commandData = commandModule.data;
      } else if (commandModule.default && commandModule.default.data) {
        // Default export with data property: export default { data: ... }
        commandData = commandModule.default.data;
      }
      
      if (commandData) {
        commands.push(commandData.toJSON());
        console.log(`✅ Loaded command: ${file}`);
      } else {
        console.log(`⚠️  [WARNING] The command at ${file} is missing a required "data" property.`);
        console.log(`   Available exports:`, Object.keys(commandModule));
        if (commandModule.default) {
          console.log(`   Default export keys:`, Object.keys(commandModule.default));
        }
      }
    } catch (error) {
      console.error(`❌ Error loading command ${file}:`, error);
    }
  }
}

// Deploy commands
async function deployCommands() {
  console.log('🔄 Loading commands...');
  await loadCommands();

  console.log('🔐 Connecting to Discord to get client ID...');
  // Create a temporary client to get the application ID
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  
  try {
    await client.login(token);
    const clientId = client.application?.id;
    
    if (!clientId) {
      throw new Error('Could not retrieve client ID from bot application');
    }

    console.log(`🤖 Using client ID: ${clientId}`);
    
    // Construct and prepare an instance of the REST module
    const rest = new REST({ version: '10' }).setToken(token);

    console.log(`🚀 Started refreshing ${commands.length} application (/) commands...`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    ) as any[];

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands!`);
    
    await client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    await client.destroy();
    process.exit(1);
  }
}

deployCommands();
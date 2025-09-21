import { REST } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// This assumes you have a config.json file with your bot credentials
// You might need to create this file or use environment variables instead
interface Config {
  clientId: string;
  guildId: string;
  token: string;
}

// Read from environment variables or config file
const clientId = (process.env.CLIENT_ID || process.env.BOT_CLIENT_ID)!;
const guildId = process.env.SWM_ID!;
const token = process.env.BOT_TOKEN!;

if (!guildId || !token) {
  console.error('Missing required environment variables: SWM_ID, BOT_TOKEN');
  console.error('CLIENT_ID is optional - will deploy globally if not provided');
  process.exit(1);
}

const commands: any[] = [];

// Grab all the command files from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`Found ${commandFiles.length} command files`);

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.default && command.default.data) {
    commands.push(command.default.data.toJSON());
  } else if (command.data) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${file} is missing a required "data" property.`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    ) as any[];

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
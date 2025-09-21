import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Client, Events, GatewayIntentBits, Collection, CommandInteraction, SlashCommandBuilder } from 'discord.js';

import ServerInit from './code/ServerInit.js';
import Over18Check from './code/Over18Check.js';
import TenshiActivity from './code/TenshiActivity.js';
import FlairCheck from './code/FlairCheck.js';
import DailyPostScheduler from './code/DailyPostScheduler.js';

// Extended Client interface to include commands collection
interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

// Command interface
interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void> | void;
  checkBirthdays?: (client: Client) => Promise<void>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ]
}) as ExtendedClient;

client.commands = new Collection<string, Command>();

async function loadCommands() {
  // Setup bot cmd directory (ES module equivalent of __dirname)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const commandsPath: string = path.join(__dirname, 'commands');
  const allFiles: string[] = fs.readdirSync(commandsPath);

  // Load .js files (compiled from TypeScript)
  const commandFiles: string[] = allFiles.filter(file => file.endsWith('.js'));
  
  console.log(`📂 Found ${commandFiles.length} command files to load`);

  // Load cmds dynamically by filename
  for (const file of commandFiles) {
    const filePath: string = path.join(commandsPath, file);
    try {
      const commandModule = await import(pathToFileURL(filePath).href);
      const command: Command = commandModule.default || commandModule;
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    } catch (error) {
      console.error(`❌ Error loading command from ${filePath}:`, error);
    }
  }
}

async function bdayCheckInterval(client: Client): Promise<void> {
  try {
    // Load the birthday command using ES module dynamic imports
    let bdayCommand;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const jsPath = path.join(__dirname, 'commands', 'bday.js');
    
    try {
      const commandModule = await import(pathToFileURL(jsPath).href);
      bdayCommand = commandModule.default || commandModule;
    } catch (error) {
      console.error('Could not load birthday command:', error);
      return;
    }
    
    if (bdayCommand.checkBirthdays) {
      await bdayCommand.checkBirthdays(client);
      setInterval(async () => {
        await bdayCommand.checkBirthdays(client);
      }, 6 * 60 * 60 * 1000);
    }
  } catch (error) {
    console.error('Error setting up birthday check interval:', error);
  }
}

client.on('ready', async () => {
  console.log(`🔌 Connected as ${client.user?.username}`);
  
  // Load commands
  await loadCommands();
  
  // Initialize components
  ServerInit.init(client);
  TenshiActivity.init(client);
  
  // Check for birthdays to celebrate on startup
  await bdayCheckInterval(client);
  
  // Initialize checks
  FlairCheck.init(client);
  Over18Check.init(client);
  
  // Initialize Daily Post Scheduler
  const dailyPostScheduler = new DailyPostScheduler(client);
  await dailyPostScheduler.init();
});

client.on('disconnect', () => {
  // Relog again here
  console.log('Connection closed! Reconnecting...');
  if (process.env.BOT_TOKEN) {
    client.login(process.env.BOT_TOKEN);
  }
});

client.on('error', (err: Error) => {
  console.error(err);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  interaction.commandName = interaction.commandName.trim();

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

if (process.env.BOT_TOKEN) {
  client.login(process.env.BOT_TOKEN);
} else {
  console.error('BOT_TOKEN environment variable is not set!');
}
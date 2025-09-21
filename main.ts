import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';

import { Client, Events, GatewayIntentBits, Collection, CommandInteraction, SlashCommandBuilder } from 'discord.js';

import ServerInit from './code/ServerInit';
import Over18Check from './code/Over18Check';
import TenshiActivity from './code/TenshiActivity';
import FlairCheck from './code/FlairCheck';
import TouhouScheduler from './code/TouhouScheduler';

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

// Setup bot cmd directory
const commandsPath: string = path.join(__dirname, 'commands');
const allFiles: string[] = fs.readdirSync(commandsPath);

// Prioritize .ts files over .js files (avoid loading both)
const commandFiles: string[] = [];
const processedCommands = new Set<string>();

// First, add all .ts files
allFiles.filter(file => file.endsWith('.ts')).forEach(file => {
  const commandName = path.basename(file, '.ts');
  commandFiles.push(file);
  processedCommands.add(commandName);
});

// Then add .js files only if there's no corresponding .ts file
allFiles.filter(file => file.endsWith('.js')).forEach(file => {
  const commandName = path.basename(file, '.js');
  if (!processedCommands.has(commandName)) {
    commandFiles.push(file);
  }
});

// Load cmds dynamically by filename
for (const file of commandFiles) {
  const filePath: string = path.join(commandsPath, file);
  const commandModule = require(filePath);
  const command: Command = commandModule.default || commandModule;
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

async function bdayCheckInterval(client: Client): Promise<void> {
  try {
    // Try to load TypeScript version first, then JavaScript
    let bdayCommand;
    const tsPath = './commands/bday.ts';
    const jsPath = './commands/bday.js';
    
    try {
      bdayCommand = require(tsPath);
      bdayCommand = bdayCommand.default || bdayCommand;
    } catch {
      try {
        bdayCommand = require(jsPath);
      } catch (error) {
        console.error('Could not load birthday command:', error);
        return;
      }
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
  
  // Initialize components
  ServerInit.init(client);
  TenshiActivity.init(client);
  
  // Check for birthdays to celebrate on startup
  await bdayCheckInterval(client);
  
  // Initialize checks
  FlairCheck.init(client);
  Over18Check.init(client);
  
  // Initialize Touhou daily scheduler
  const touhouScheduler = new TouhouScheduler(client);
  await touhouScheduler.init();
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
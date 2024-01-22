const dotenv = require("dotenv");
dotenv.config();

const fs = require('node:fs');
const path = require('node:path');

const { Client, Events, GatewayIntentBits, Collection } = require("discord.js");

const ServerInit = require("./code/ServerInit.js");
const Over18Check = require("./code/Over18Check.js");
const TenshiActivity = require("./code/TenshiActivity.js");
const FlairCheck = require("./code/FlairCheck.js");
const Utils = require("./code/Utils.js");

const client = new Client({
	intents: [
	  GatewayIntentBits.Guilds,
	  GatewayIntentBits.GuildMessages,
	  GatewayIntentBits.GuildMessageReactions
	]
  });

client.commands = new Collection();

// Setup bot cmd directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load cmds dynamically by filename
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

async function bdayCheckInterval(client) {
	await require("./commands/bday.js").checkBirthdays(client);
	setInterval(async () => {
		await require("./commands/bday.js").checkBirthdays(client);
	}, 6 * 60 * 60 * 1000);
}

client.on("ready", async () => {
    console.log(`🔌 Connected as ${client.user.username}`);
    //MemberStatus.init(client);
    ServerInit.init(client);
    //TenshiInteract.init(client);
    TenshiActivity.init(client);
	// Check for birthdays to celebrate on startup
	await bdayCheckInterval(client)
	// Flair Check
	FlairCheck.init(client);
	Over18Check.init(client);
});

client.on('disconnect', function () {
    // Relog again here
    console.log("Connection closed! Reconnecting...");
    client.login(process.env.BOT_TOKEN);
});

client.on('error', (err) => {
    //setTimeout(this.reconnect, reconnection_time);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

    interaction.commandName = interaction.commandName.trim();

	const command = interaction.client.commands.get(interaction.commandName);

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

client.login(process.env.BOT_TOKEN);


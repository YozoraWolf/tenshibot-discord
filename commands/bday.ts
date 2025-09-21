import fs from 'fs';
import { EmbedBuilder, SlashCommandBuilder, CommandInteraction, Client, TextChannel } from 'discord.js';
import Utils from '../code/Utils.js';
import axios, { AxiosResponse } from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
import { BirthdayData } from '../types/index.js';
dotenv.config();

// Tenor API response types
interface TenorGif {
  media_formats: {
    gif: {
      url: string;
    };
  };
}

interface TenorResponse {
  results: TenorGif[];
}

const command = {
  data: new SlashCommandBuilder()
    .setName('setbday')
    .setDescription('Set your birthday')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Your name')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName('day')
        .setDescription('The day of your birth')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName('month')
        .setDescription('The month of your birth (1-12)')
        .setRequired(true)
    ),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    // Get the user's input from the interaction
    const name = interaction.options.get('name')?.value as string;
    const day = interaction.options.get('day')?.value as number;
    const month = interaction.options.get('month')?.value as number;
    const userId = interaction.user.id;

    const data = command.loadBdays();

    // Check if the user has already set their birthday
    if (data[userId]) {
      const embed = new EmbedBuilder()
        .setTitle(`Sorry, ${interaction.user.username}, you have already set your birthday.`)
        .setColor('#ff0000');

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Check if the day and month are valid
    if (!Utils.isValidDate(day, month, new Date().getFullYear())) {
      const embed = new EmbedBuilder()
        .setTitle(`Sorry, ${interaction.user.username}, you have entered an invalid date.`)
        .setDescription('Please enter a valid date between 1 and 31 for the day, and between 1 and 12 for the month.')
        .setColor('#ff0000');

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Add the new data to the JSON object
    if (!data[userId]) {
      data[userId] = {
        name: '',
        day: 0,
        month: 0,
        years: {}
      };
    }
    data[userId].name = name;
    data[userId].day = day;
    data[userId].month = month;
    data[userId].years = {};

    // Write the updated data back to the JSON file
    fs.writeFileSync('birthdays.json', JSON.stringify(data, null, 2));

    // Send a confirmation message to the user
    const embed = new EmbedBuilder()
      .setTitle(`Thanks for setting your birthday, ${name}!`)
      .setColor('#25a302');

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await command.checkBirthdays(interaction.client);
  },

  async checkBirthdays(client: Client): Promise<void> {
    console.log('🎈 Performing Birthday Checks...');

    const data = command.loadBdays();

    // Get today's date
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();
    const year = todayYear.toString();

    // Loop through the data and check for birthdays to celebrate
    for (const id in data) {
      const day = data[id].day;
      const month = data[id].month;

      // Check if the birthday has not been celebrated this year
      if (month === todayMonth && day === todayDay && !data[id].years?.hasOwnProperty(year)) {
        const tenorApikey = process.env.TENOR_API_KEY;
        const tags = 'anime+birthday';
        const randomPage = Math.floor(Math.random() * 100) + 1; // generate a random page number between 1-100
        const limit = 50;
        const url = `https://tenor.googleapis.com/v2/search?q=${tags}&key=${tenorApikey}&limit=${limit}&pos=${randomPage}`;

        let message: any = undefined;
        const channel = client.channels.cache.get(process.env.SWM_LOBBY_ID!) as TextChannel;
        
        if (!channel) {
          console.error('Could not find lobby channel for birthday announcement');
          continue;
        }

        try {
          if (tenorApikey) {
            const response: AxiosResponse<TenorResponse> = await axios.get(url);
            const gifs = response.data.results;
            
            if (gifs && gifs.length > 0) {
              const gif = gifs[Utils.getRandomIntInclusive(0, Math.min(49, gifs.length - 1))].media_formats.gif.url;

              const embed = new EmbedBuilder()
                .setColor('#FFC0CB')
                .setTitle(`🎉 Happy birthday ${data[id].name}! 🎉`)
                .setDescription('Say Happy Birthday, everyone! 🎉')
                .setImage(gif);

              message = await channel.send({ embeds: [embed] });
            } else {
              throw new Error('No GIFs found');
            }
          } else {
            throw new Error('No Tenor API key');
          }
        } catch (err) {
          console.error('Error fetching birthday GIF:', err);
          // Send a birthday message in the channel
          const messageTxt = `🎉 Happy birthday ${data[id].name}! 🎉`;
          message = await channel.send(messageTxt);
        }

        // Update the data to show that the birthday has been celebrated
        if (!data[id].years) data[id].years = {};
        data[id].years[year] = {
          celebrated: true,
          messageId: message?.id || ''
        };
        fs.writeFileSync('birthdays.json', JSON.stringify(data, null, 2));
      }
    }
  },

  loadBdays(): BirthdayData {
    // Check if the birthdays file exists
    const birthdaysFile = 'birthdays.json';
    if (!fs.existsSync(birthdaysFile)) {
      // If it doesn't exist, create an empty object and write it to the file
      console.error("birthdays.json file doesn't exist. Creating...");
      fs.writeFileSync(birthdaysFile, '{}');
    }

    try {
      // Load the existing data from the JSON file
      const fileContent = fs.readFileSync(birthdaysFile, 'utf-8');
      return JSON.parse(fileContent) as BirthdayData;
    } catch (error) {
      console.error('Error parsing birthdays.json:', error);
      return {};
    }
  }
};

export default command;
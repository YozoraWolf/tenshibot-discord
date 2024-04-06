const fs = require('fs');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { isValidDate, getRandomIntInclusive } = require('../code/Utils');
const axios = require('axios');
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbday')
        .setDescription('Set your birthday')
        .addStringOption(option => option.setName('name').setDescription('Your name').setRequired(true))
        .addIntegerOption(option => option.setName('day').setDescription('The day of your birth').setRequired(true))
        .addIntegerOption(option => option.setName('month').setDescription('The month of your birth (1-12)').setRequired(true)),
    execute(interaction) {
        // Get the user's input from the interaction
        const name = interaction.options.getString('name');
        const day = interaction.options.getInteger('day');
        const month = interaction.options.getInteger('month');
        const userId = interaction.user.id;

        data = this.loadBdays();

        // Check if the user has already set their birthday
        if (data[userId]) {
            const embed = new EmbedBuilder()
                .setTitle(`Sorry, ${interaction.user.username}, you have already set your birthday.`)
                .setColor('#ff0000');

            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Check if the day and month are valid
        if (!isValidDate(day, month, new Date().getFullYear())) {
            const embed = new EmbedBuilder()
                .setTitle(`Sorry, ${interaction.user.username}, you have entered an invalid date.`)
                .setDescription('Please enter a valid date between 1 and 31 for the day, and between 1 and 12 for the month.')
                .setColor('#ff0000');

            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Add the new data to the JSON object
        if (!data[userId]) {
            data[userId] = {};
        }
        data[userId].name = name;
        data[userId].day = day;
        data[userId].month = month;
        data[userId].years = {};

        // Write the updated data back to the JSON file
        fs.writeFileSync("birthdays.json", JSON.stringify(data, null, 2));

        // Send a confirmation message to the user
        const embed = new EmbedBuilder()
            .setTitle(`Thanks for setting your birthday, ${name}!`)
            .setColor('#25a302');

        interaction.reply({ embeds: [embed], ephemeral: true });
        this.checkBirthdays(interaction.client);
        return;
    },
    async checkBirthdays(client) {
        console.log("🎈 Performing Birthday Checks...");

        const data = this.loadBdays();

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
            if (month === todayMonth && day === todayDay && !data[id].years.hasOwnProperty(year)) {

                const tenorApikey = process.env.TENOR_API_KEY;
                const tags = 'anime+birthday';
                const randomPage = Math.floor(Math.random() * 100) + 1; // generate a random page number between 1-100
                const limit = 50;
                const url = `https://tenor.googleapis.com/v2/search?q=${tags}&key=${tenorApikey}&limit=${limit}&pos=${randomPage}`;

                let message = undefined;
                const channel = client.channels.cache.get(process.env.SWM_LOBBY_ID);
                try {
                    const response = await axios.get(url);
                    const gifs = response.data.results;
                    const gif = gifs[getRandomIntInclusive(0, 49)].media_formats.gif.url;

                    const embed = new EmbedBuilder()
                        .setColor('#FFC0CB')
                        .setTitle(`🎉 Happy birthday ${data[id].name}! 🎉`)
                        .setDescription('Say Happy Birthday, everyone! 🎉')
                        .setImage(gif);

                    message = await channel.send({ embeds: [embed] });
                } catch (err) {
                    console.error(err);
                    // Send a birthday message in the channel
                    const messageTxt = `🎉 Happy birthday ${data[id].name}! 🎉`;
                    message = await channel.send(messageTxt);
                }



                // Update the data to show that the birthday has been celebrated
                if (data[id].years === undefined) data[id].years = {};
                data[id].years[year] = {};
                data[id].years[year].celebrated = true;
                data[id].years[year].messageId = message.id;
                fs.writeFileSync('birthdays.json', JSON.stringify(data, null, 2));
            }
        }
    },
    loadBdays() {
        // Check if the birthdays file exists
        const birthdaysFile = 'birthdays.json';
        if (!fs.existsSync(birthdaysFile)) {
            // If it doesn't exist, create an empty object and write it to the file
            console.error("birthdays.json file doesn't exist. Creating...");
            fs.writeFileSync(birthdaysFile, '{}');
        }

        // Load the existing data from the JSON file
        return JSON.parse(fs.readFileSync(birthdaysFile));
    },

}
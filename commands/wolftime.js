const { SlashCommandBuilder } = require('discord.js');
const Utils = require("../code/Utils.js");
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wolftime')
        .setDescription('Get Wolf\'s current time!'),
    async execute(interaction) {
        // Get current time in Japan
        const japanTime = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        await interaction.reply(`Wolf's current time in Japan is: ***${japanTime}***`);
    }
};
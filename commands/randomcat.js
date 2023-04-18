const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch-commonjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomcat')
    .setDescription('Displays a random cat picture.'),
  async execute(interaction) {
    const response = await fetch('https://cataas.com/cat');
    const buffer = await response.buffer();
    const imageUrl = response.url;
    const embed = new EmbedBuilder()
      .setColor('#00ffff')
      .setTitle('Random Cats')
      .setImage('attachment://cat.jpg')
      .setFooter({ text: `https://cataas.com/`});

    interaction.reply({
      embeds: [embed],
      files: [{ attachment: buffer, name: `cat.jpg` }],
    });
  },
};

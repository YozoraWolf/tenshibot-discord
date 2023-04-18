const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch-commonjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomwaifu')
    .setDescription('Displays a random waifu image.'),
  async execute(interaction) {
    const totalImages = 100000;
    const id = Math.floor(Math.random() * totalImages);
    const imageUrl = `https://www.thiswaifudoesnotexist.net/example-${id}.jpg`;

    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const embed = new EmbedBuilder()
      .setColor('#ff69b4')
      .setTitle('This Waifu does not exist')
      .setDescription(`[Source](${imageUrl})`)
      .setImage('attachment://waifu.jpg')
      .setFooter({ text: `https://www.thiswaifudoesnotexist.net/`});

    interaction.reply({
      embeds: [embed],
      files: [{ attachment: buffer, name: 'waifu.jpg' }],
    });
  },
};
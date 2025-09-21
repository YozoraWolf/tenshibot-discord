import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch-commonjs');

const command = {
  data: new SlashCommandBuilder()
    .setName('randomwaifu')
    .setDescription('Displays a random waifu image.'),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    try {
      const totalImages = 100000;
      const id = Math.floor(Math.random() * totalImages);
      const imageUrl = `https://www.thiswaifudoesnotexist.net/example-${id}.jpg`;

      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.buffer();
      const embed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setTitle('This Waifu does not exist')
        .setDescription(`[Source](${imageUrl})`)
        .setImage('attachment://waifu.jpg')
        .setFooter({ text: 'https://www.thiswaifudoesnotexist.net/' });

      await interaction.reply({
        embeds: [embed],
        files: [{ attachment: buffer, name: 'waifu.jpg' }],
      });
    } catch (error) {
      console.error('Error fetching waifu image:', error);
      await interaction.reply({
        content: 'Sorry, I couldn\'t fetch a waifu image right now. Please try again later!',
        ephemeral: true
      });
    }
  },
};

export default command;
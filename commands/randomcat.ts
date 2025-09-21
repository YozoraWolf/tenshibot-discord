import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch-commonjs';

const command = {
  data: new SlashCommandBuilder()
    .setName('randomcat')
    .setDescription('Displays a random cat picture.'),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    try {
      const response = await fetch('https://cataas.com/cat');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.buffer();
      const embed = new EmbedBuilder()
        .setColor('#00ffff')
        .setTitle('Random Cats')
        .setImage('attachment://cat.jpg')
        .setFooter({ text: 'https://cataas.com/' });

      await interaction.reply({
        embeds: [embed],
        files: [{ attachment: buffer, name: 'cat.jpg' }],
      });
    } catch (error) {
      console.error('Error fetching cat image:', error);
      await interaction.reply({
        content: 'Sorry, I couldn\'t fetch a cat image right now. Please try again later!',
        ephemeral: true
      });
    }
  },
};

export default command;
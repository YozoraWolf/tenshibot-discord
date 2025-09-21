import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import Utils from '../code/Utils';

const coin: string[] = ['/', '_', '\\'];

const command = {
  data: new SlashCommandBuilder()
    .setName('flip')
    .setDescription('Flips a coin'),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    let coin_i = 0;
    console.log('sending msg');
    await interaction.reply('Throwing coin! _');
    await new Promise(r => setTimeout(r, 2000));
    
    Utils.setIntervalX(async () => {
      if (coin_i === coin.length) coin_i = 0;
      await interaction.editReply(coin[coin_i++]);
    }, 500, Utils.getRandomIntInclusive(10, 30), async () => {
      if (Utils.getRandomIntInclusive(0, 1) === 0) {
        await interaction.editReply('_\nYou got tails!');
      } else {
        await interaction.editReply('_\nYou got heads!');
      }
    });
  }
};

export default command;
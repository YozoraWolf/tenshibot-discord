import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import Jimp from 'jimp';

const command = {
  data: new SlashCommandBuilder()
    .setName('tenshisign')
    .setDescription('Check Tenshi\'s sign with a custom message')
    .addStringOption(option =>
      option.setName('sign')
        .setDescription('Custom message to add to Tenshi\'s sign')
        .setRequired(true)
    ),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    const sign = interaction.options.get('sign')?.value as string;
    
    if (sign.length > 45) {
      return void await interaction.reply({
        content: 'The message is too long for me to hold, please shorten it to 45 characters!',
        ephemeral: true,
      });
    }

    try {
      // Do stuff with the image.
      const tenImg = await Jimp.read('images/tenshi.jpg');
      const txtImg = await Jimp.create(300, 150);
      const font = await Jimp.loadFont('fonts/impact.ttf.fnt');
      txtImg.print(font, 15, 30, sign, 260, 150).rotate(8);
      tenImg.blit(txtImg, 0, 0);
      const buffer = await tenImg.getBufferAsync(Jimp.MIME_JPEG);
      
      await interaction.reply({
        content: 'Here you go ~',
        files: [{ attachment: buffer, name: 'tenshisign.jpg' }],
        ephemeral: false,
      });
    } catch (error) {
      console.error('Error creating Tenshi sign:', error);
      await interaction.reply({
        content: 'Sorry, there was an error creating your sign!',
        ephemeral: true,
      });
    }
  },
};

export default command;
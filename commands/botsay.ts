import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';

const command = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something on your behalf')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to say')
        .setRequired(true)
    ),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'You must be an admin to use this command.',
        ephemeral: true
      });
      return;
    }

    const message = interaction.options.get('message')?.value as string;

    if (!message) {
      await interaction.reply({
        content: 'Please provide a message to say.',
        ephemeral: true
      });
      return;
    }

    // Make the bot say the message
    await interaction.reply({
      content: message,
      allowedMentions: { repliedUser: false }
    });
  }
};

export default command;
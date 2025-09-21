import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import Poll from '../classes/Poll.js';

const command = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Start a poll with up to 4 options')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('option1')
        .setDescription('The first option')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('option2')
        .setDescription('The second option')
    )
    .addStringOption(option =>
      option.setName('option3')
        .setDescription('The third option')
    )
    .addStringOption(option =>
      option.setName('option4')
        .setDescription('The fourth option')
    )
    .addIntegerOption(option =>
      option.setName('time')
        .setDescription('The time limit for the poll in seconds')
    )
    .addBooleanOption(option =>
      option.setName('multi')
        .setDescription('Will the poll be multiple selection?')
    ),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    // Retrieve options from the interaction
    const question = interaction.options.get('question')?.value as string;
    const multi = (interaction.options.get('multi')?.value as boolean) || false;

    const options: string[] = [];
    for (let i = 1; i <= Poll.MAX_OPTIONS; i++) {
      const option = interaction.options.get(`option${i}`)?.value as string | undefined;
      if (option) options.push(option);
    }
    const timeLimit = (interaction.options.get('time')?.value as number) || 30;

    const p = new Poll(interaction, multi, question, options, timeLimit);
    await p.start();
  }
};

export default command;
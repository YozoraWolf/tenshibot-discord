const { SlashCommandBuilder } = require('@discordjs/builders');
const Poll = require('../classes/Poll.js');


module.exports = {
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
  async execute(interaction) {
    // Retrieve options from the interaction
    const question = interaction.options.getString('question');
    const multi = interaction.options.getBoolean('multi') || false;

    const options = [];
    for (let i = 1; i <= Poll.MAX_OPTIONS; i++) {
      const option = interaction.options.getString(`option${i}`);
      if (option) options.push(option);
    }
    const timeLimit = interaction.options.getInteger('time') || 30;

    const p = new Poll(interaction, multi, question, options, timeLimit); 
    await p.start();
    
  },
};
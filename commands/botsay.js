const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something on your behalf')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message to say')
                .setRequired(true)),
    async execute(interaction = CommandInteraction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({
                content: 'You must be an admin to use this command.',
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');

        // Make the bot say the message
        interaction.reply({
            content: message,
            allowedMentions: { repliedUser: false }
        });
    }
};
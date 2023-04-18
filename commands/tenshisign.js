const { CommandInteraction } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');
const Jimp = require("jimp");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('tenshisign')
    .setDescription('Check Tenshi\'s sign with a custom message')
    .addStringOption(option =>
        option.setName('sign')
            .setDescription('Custom message to add to Tenshi\'s sign')
            .setRequired(true)),
    options: [
        {
            name: "sign",
            description: "Custom message to add to Tenshi's sign",
            type: "STRING",
            required: true,
        },
    ],
    async execute(interaction = CommandInteraction) {
        const sign = interaction.options.getString("sign");
        if (sign.length > 45) {
            return interaction.reply({
                content: "The message is too long for me to hold, please shorten it to 45 characters!",
                ephemeral: true,
            });
        }

        // Do stuff with the image.
        const tenImg = await Jimp.read("images/tenshi.jpg");
        const txtImg = await Jimp.create(300, 150);
        const font = await Jimp.loadFont("fonts/impact.ttf.fnt");
        txtImg.print(font, 15, 30, sign, 260, 150).rotate(8);
        tenImg.blit(txtImg, 0, 0);
        const buffer = await tenImg.getBufferAsync(Jimp.MIME_JPEG);
        return interaction.reply({
            content: "Here you go ~",
            files: [buffer],
            ephemeral: false,
        });
    },
};
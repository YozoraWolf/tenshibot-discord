import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import moment from 'moment-timezone';
import type { CommandInteraction, CacheType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('wolftime')
    .setDescription('Shows the current time at Wolf\'s location (Tokyo, Japan)');

export async function execute(interaction: CommandInteraction<CacheType>) {
    // Fixed timezone for Tokyo, Japan (Wolf's location)
    const tokyoTimezone = 'Asia/Tokyo';
    
    try {
        const currentTime = moment().tz(tokyoTimezone);
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🐺 Wolf Time')
            .setDescription('Current time at Wolf\'s location')
            .addFields(
                {
                    name: '📍 Location',
                    value: 'Tokyo, Japan 🇯🇵',
                    inline: true
                },
                {
                    name: '🕒 Time',
                    value: currentTime.format('h:mm:ss A'),
                    inline: true
                },
                {
                    name: '📅 Date',
                    value: currentTime.format('dddd, MMMM Do YYYY'),
                    inline: false
                },
                {
                    name: '🌐 Timezone',
                    value: `Asia/Tokyo (UTC${currentTime.format('Z')})`,
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'Wolf Time • Tokyo, Japan'
            });

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error getting Wolf time:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while getting Wolf\'s time.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed] });
    }
}
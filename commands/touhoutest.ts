import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import TouhouScheduler from '../code/TouhouScheduler';

const command = {
  data: new SlashCommandBuilder()
    .setName('touhoutest')
    .setDescription('Manually trigger a daily Touhou waifu post (Admin/Owner only)')
    .addStringOption(option =>
      option.setName('channel')
        .setDescription('Override channel to post in (default: both sfw and nsfw)')
        .setRequired(false)
        .addChoices(
          { name: 'SFW only', value: 'sfw' },
          { name: 'NSFW only', value: 'nsfw' },
          { name: 'Both (default)', value: 'both' },
          { name: 'Test (bottests)', value: 'bottests' }
        )
    )
    .addStringOption(option =>
      option.setName('rating')
        .setDescription('Override content rating (for single channel tests)')
        .setRequired(false)
        .addChoices(
          { name: 'Safe', value: 'safe' },
          { name: 'NSFW/Explicit', value: 'explicit' }
        )
    ),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    // Check if user has Administrator permission or Owner role
    if (!interaction.inGuild()) {
      await interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
      return;
    }

    const member = interaction.member;
    if (!member) {
      await interaction.reply({ content: '❌ Could not find member information!', ephemeral: true });
      return;
    }

    // Check for Administrator permissions
    const hasAdminPerms = member.permissions instanceof Object && 
                         'has' in member.permissions && 
                         typeof member.permissions.has === 'function' &&
                         member.permissions.has(PermissionFlagsBits.Administrator);
    
    // Check for Owner role
    const hasOwnerRole = 'roles' in member && 
                        member.roles && 
                        'cache' in member.roles &&
                        member.roles.cache.some((role: any) => role.name.toLowerCase() === 'owner');

    if (!hasAdminPerms && !hasOwnerRole) {
      await interaction.reply({ 
        content: '❌ You need Administrator permissions or the "Owner" role to use this command!', 
        ephemeral: true 
      });
      return;
    }

    try {
      await interaction.deferReply();
      
      const channelOverride = interaction.options.get('channel')?.value as string || 'both';
      const ratingOverride = interaction.options.get('rating')?.value as 'safe' | 'explicit' || 'safe';
      
      const scheduler = new TouhouScheduler(interaction.client);
      
      if (channelOverride === 'both') {
        // Post to both channels (default behavior)
        await scheduler.postDailyTouhouWaifus();
        await interaction.editReply('✅ Daily Touhou waifu posts triggered successfully for both SFW and NSFW channels!');
      } else {
        // Post to specific channel
        let rating: 'safe' | 'explicit' = ratingOverride;
        
        // Auto-determine rating if not specified
        if (!interaction.options.get('rating')) {
          if (channelOverride === 'sfw') rating = 'safe';
          else if (channelOverride === 'nsfw') rating = 'explicit';
          else rating = 'safe'; // Default for bottests
        }
        
        await scheduler.postDailyTouhouWaifu(channelOverride, rating);
        await interaction.editReply(`✅ Daily Touhou waifu post triggered successfully for #${channelOverride} with ${rating} content!`);
      }
    } catch (error) {
      console.error('Error triggering Touhou post:', error);
      await interaction.editReply('❌ Error triggering the daily Touhou post. Check console for details.');
    }
  },
};

export default command;
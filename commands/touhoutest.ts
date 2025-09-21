import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import DailyPostScheduler from '../code/DailyPostScheduler.js';

const command = {
  data: new SlashCommandBuilder()
    .setName('touhoutest')
    .setDescription('Manually trigger a daily post (Admin/Owner only)')
    .addStringOption(option =>
      option.setName('postid')
        .setDescription('Post ID from configuration (e.g., touhou_sfw, touhou_nsfw, miku_daily)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('channel')
        .setDescription('Override channel to post in (legacy mode only)')
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
        .setDescription('Override rating (legacy mode only)')
        .setRequired(false)
        .addChoices(
          { name: 'Safe/SFW', value: 'safe' },
          { name: 'Explicit/NSFW', value: 'explicit' }
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
      
      const postId = interaction.options.get('postid')?.value as string;
      const channelOverride = interaction.options.get('channel')?.value as string;
      const ratingOverride = interaction.options.get('rating')?.value as 'safe' | 'explicit';
      
      const scheduler = new DailyPostScheduler(interaction.client);
      
      if (postId) {
        // New mode: trigger specific configured post
        const configs = scheduler.getPostConfigs();
        const config = configs.find(c => c.id === postId);
        
        if (!config) {
          const availableIds = configs.map(c => c.id).join(', ');
          await interaction.editReply(`❌ Post ID "${postId}" not found! Available IDs: ${availableIds}`);
          return;
        }
        
        const success = await scheduler.triggerPost(postId);
        if (success) {
          await interaction.editReply(`✅ Successfully triggered "${config.title}" (${postId})!`);
        } else {
          await interaction.editReply(`❌ Failed to trigger "${config.title}" (${postId}).`);
        }
      } else {
        // Legacy mode: Touhou-specific behavior with overrides
        if (channelOverride === 'both' || !channelOverride) {
          // Post all Touhou posts (SFW and NSFW)
          await scheduler.postDailyTouhouWaifus();
          await interaction.editReply('✅ Daily Touhou waifu posts triggered successfully for both SFW and NSFW channels!');
        } else {
          // Post to specific channel with legacy method
          let rating: 'safe' | 'explicit' = ratingOverride || 'safe';
          
          // Auto-determine rating if not specified
          if (!ratingOverride) {
            if (channelOverride === 'sfw') rating = 'safe';
            else if (channelOverride === 'nsfw') rating = 'explicit';
            else rating = 'safe'; // Default for bottests
          }
          
          await scheduler.postDailyTouhouWaifu(channelOverride, rating);
          await interaction.editReply(`✅ Daily Touhou waifu post triggered successfully for #${channelOverride} with ${rating} content!`);
        }
      }
    } catch (error) {
      console.error('Error triggering daily post:', error);
      await interaction.editReply('❌ Error triggering the daily post. Check console for details.');
    }
  },
};

export default command;
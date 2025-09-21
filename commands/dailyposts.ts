import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import DailyPostScheduler from '../code/DailyPostScheduler.js';

const command = {
  data: new SlashCommandBuilder()
    .setName('dailyposts')
    .setDescription('Manage daily posts configuration (Admin/Owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all configured daily posts')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('trigger')
        .setDescription('Manually trigger a specific daily post')
        .addStringOption(option =>
          option.setName('postid')
            .setDescription('Post ID to trigger')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('triggerall')
        .setDescription('Manually trigger all enabled daily posts')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reload')
        .setDescription('Reload the daily posts configuration from file')
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

    // Determine which subcommand was used by checking for its presence
    let subcommand = '';
    if (interaction.options.get('postid')) {
      subcommand = 'trigger';
    } else {
      // Check data array for subcommand
      const subcommandData = interaction.options.data.find(option => option.type === 1);
      subcommand = subcommandData?.name || '';
    }

    try {
      await interaction.deferReply();
      
      const scheduler = new DailyPostScheduler(interaction.client);
      
      switch (subcommand) {
        case 'list': {
          const configs = scheduler.getPostConfigs();
          
          if (configs.length === 0) {
            await interaction.editReply('📄 No daily posts configured.');
            return;
          }

          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📅 Daily Posts Configuration')
            .setDescription(`Found ${configs.length} configured daily posts`)
            .setTimestamp();

          configs.forEach(config => {
            const status = config.enabled ? '✅ Enabled' : '❌ Disabled';
            const rating = config.rating === 'safe' ? '🌸 SFW' : '🔞 NSFW';
            
            embed.addFields({
              name: `${config.emoji} ${config.title}`,
              value: [
                `**ID:** \`${config.id}\``,
                `**Status:** ${status}`,
                `**Channel:** #${config.channel}`,
                `**Rating:** ${rating}`,
                `**Time:** ${config.time} ${config.timezone}`,
                `**Tags:** \`${config.tags}\``
              ].join('\n'),
              inline: false
            });
          });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'trigger': {
          const postId = interaction.options.get('postid')?.value as string;
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
          break;
        }

        case 'triggerall': {
          await scheduler.triggerAllPosts();
          const enabledCount = scheduler.getPostConfigs().filter(c => c.enabled).length;
          await interaction.editReply(`✅ Successfully triggered all ${enabledCount} enabled daily posts!`);
          break;
        }

        case 'reload': {
          scheduler.reloadConfig();
          const configs = scheduler.getPostConfigs();
          await interaction.editReply(`🔄 Configuration reloaded! Found ${configs.length} daily posts.`);
          break;
        }

        default:
          await interaction.editReply('❌ Unknown subcommand.');
      }
    } catch (error) {
      console.error('Error in dailyposts command:', error);
      await interaction.editReply('❌ Error executing command. Check console for details.');
    }
  },
};

export default command;

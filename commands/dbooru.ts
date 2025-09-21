import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import Utils from '../code/Utils';
import axios, { AxiosResponse } from 'axios';

// Danbooru API types
interface DanbooruTag {
  post_count: number;
  name: string;
}

interface DanbooruMediaAsset {
  variants: Array<{
    url: string;
    type: string;
  }>;
}

interface DanbooruPost {
  id: number;
  rating: string;
  source: string;
  media_asset: DanbooruMediaAsset;
}

interface DanbooruArtistCommentary {
  original_title?: string;
  original_description?: string;
}

const DBOORU = 'https://danbooru.donmai.us';
const headers = {
  'Referer': DBOORU,
  'Content-Type': 'application/json'
};

const getMaxPagesForTags = async (tagNames: string[], postsPerPage: number = 20): Promise<number> => {
  const tagString = tagNames.filter(tag => tag && tag.trim()).join('+');
  try {
    const response: AxiosResponse<DanbooruTag[]> = await axios.get(
      `${DBOORU}/tags.json?search[name_matches]=${tagString}`, 
      { headers }
    );

    const tags = response.data;
    const postCount = tags.reduce((sum, tag) => sum + tag.post_count, 0);
    const maxPages = Math.ceil(postCount / postsPerPage);
    return maxPages;
  } catch (error) {
    console.error('Error getting max pages:', error);
    return 1;
  }
};

const getPost = async (tags: string, pageMax: number): Promise<DanbooruPost[]> => {
  console.log(`${DBOORU}/posts.json?tags=${tags}&page=${Utils.getRandom(1, Math.ceil(pageMax))}`);
  try {
    const { data }: AxiosResponse<DanbooruPost[]> = await axios.get(
      `${DBOORU}/posts.json?tags=${tags}&page=${Utils.getRandom(1, Math.ceil(pageMax))}`, 
      { headers }
    );
    return data;
  } catch (error) {
    console.error('Error getting post:', error);
    return [];
  }
};

const command = {
  data: new SlashCommandBuilder()
    .setName('dbooru')
    .setDescription('Get a random image from Danbooru with the specified tags')
    .addStringOption(option => 
      option.setName('tag1')
        .setDescription('the first tag to search for')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('tag2')
        .setDescription('the second tag to search for')
        .setRequired(false)
    )
    .addStringOption(option => 
      option.setName('rating')
        .setDescription('The rating you are searching for (g/q/e)')
        .setRequired(false)
        .addChoices(
          { name: 'Any', value: '*' },
          { name: 'Safe', value: 'general' },
          { name: 'Questionable', value: 'questionable' },
          { name: 'Explicit', value: 'explicit' }
        )
    ),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    try {
      const tag1 = interaction.options.get('tag1')?.value as string;
      const tag2 = interaction.options.get('tag2')?.value as string;
      const rating = interaction.options.get('rating')?.value as string;

      const tags: string[] = [
        tag1?.split(' ')[0] || '',
        tag2?.split(' ')[0] || '',
        rating?.split(' ')[0] || ''
      ].map(s => s || '');

      console.log('Tags:', tags);

      let pageMax = await getMaxPagesForTags([tags[0], tags[1]], 20);
      // Prevent it from going above the API Max (1000)
      pageMax = pageMax > 1000 ? 999 : pageMax;

      const maxRetries = 5;
      let retries = 0;
      let rPosts: DanbooruPost[] = [];
      let rPost: DanbooruPost | undefined;

      await interaction.reply('Ok, wait a moment');

      do {
        rPosts = await getPost(`${tags[0]}+${tags[1]}`, pageMax);
        
        if (!['', '*'].includes(tags[2]?.charAt(0) || '')) {
          rPosts = rPosts.filter(p => p.rating.charAt(0) === tags[2].charAt(0));
          retries++;
          console.log('Filtered posts length:', rPosts.length);
          console.log('Retry:', retries);
        } else {
          break;
        }
      } while (rPosts.length === 0 && retries < maxRetries);

      rPost = rPosts[Utils.getRandom(0, rPosts.length - 1)];

      if (retries === maxRetries) {
        await interaction.editReply({
          content: 'Sorry, I couldn\'t find anything with that rating, try something else.'
        });
        return;
      }

      if (rPost === undefined) {
        await interaction.editReply({
          content: 'Sorry, I couldn\'t find anything with that, try something else.'
        });
        return;
      }

      // Get artist commentary
      let rPostTitle: DanbooruArtistCommentary = {};
      try {
        const { data }: AxiosResponse<DanbooruArtistCommentary> = await axios.get(
          `${DBOORU}/posts/${rPost.id}/artist_commentary.json`, 
          { headers }
        );
        rPostTitle = data;
      } catch (error) {
        console.error('Error getting artist commentary:', error);
      }

      console.log(`Posted Embed for dbooru #${rPost.id}`);

      // Get the image URL from media asset
      const imageUrl = rPost.media_asset?.variants?.[2]?.url || rPost.media_asset?.variants?.[0]?.url;
      
      if (!imageUrl) {
        await interaction.editReply({
          content: 'Sorry, I couldn\'t load the image for this post.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#007FFF')
        .setTitle(rPostTitle.original_title || `Post #${rPost.id}`)
        .setDescription(`${rPostTitle.original_description || ''}\n${rPost.source ? `Source: ${rPost.source}` : ''}`.trim() || 'No description available')
        .setImage(imageUrl)
        .setFooter({ text: 'Danbooru' });

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.error('Error in dbooru command:', error);
      await interaction.editReply({
        content: 'Sorry, something went wrong while fetching the image. Please try again later!'
      });
    }
  }
};

export default command;
import cron from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import axios, { AxiosResponse } from 'axios';

// Danbooru API types
interface DanbooruPost {
  id: number;
  rating: string;
  source: string;
  file_url: string;
  large_file_url?: string;
  preview_file_url?: string;
  tag_string: string;
  tag_string_character: string;
  tag_string_copyright: string;
}

interface DanbooruCountResponse {
  counts: {
    posts: number;
  };
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

export default class TouhouScheduler {
  private client: Client;
  private channelId: string;
  private guildId: string;

  constructor(client: Client) {
    this.client = client;
    this.channelId = process.env.BOTTEST_CHANNEL_ID || '';
    this.guildId = process.env.SWM_ID || '';
  }

  // Initialize the scheduler
  public async init(): Promise<void> {
    console.log('🗓️ Initializing Touhou Daily Scheduler...');
    
    // Schedule daily Touhou waifu posts at 9:00 PM JST
    cron.schedule('0 21 * * *', async () => {
      console.log('🎯 Running daily Touhou waifu posts...');
      await this.postDailyTouhouWaifus();
    }, {
      timezone: 'Asia/Tokyo'
    });

    console.log('✅ Touhou Daily Scheduler initialized! Posts will be made daily at 9:00 PM JST');
  }

  // Find specific channels by name
  private async findChannel(channelName: string): Promise<TextChannel | null> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const channels = await guild.channels.fetch();
      
      const channel = channels.find(ch => 
        ch?.name === channelName && ch.isTextBased()
      ) as TextChannel;
      
      return channel || null;
    } catch (error) {
      console.error(`Error finding #${channelName} channel:`, error);
      return null;
    }
  }

  // Get a random Touhou image from Danbooru with specific rating
  private async getRandomTouhouImage(rating: 'safe' | 'questionable' | 'explicit' = 'safe'): Promise<DanbooruPost | null> {
    try {
      // Use Touhou tag with rating-specific filters
      const tags = rating === 'safe' 
        ? 'touhou rating:safe score:>10'
        : 'touhou rating:explicit score:>5'; // For NSFW channel
      
      // Get total count of posts
      const countResponse: AxiosResponse<DanbooruCountResponse> = await axios.get(
        `${DBOORU}/counts/posts.json?tags=${encodeURIComponent(tags)}`,
        { headers, timeout: 10000 }
      );

      const totalPosts = countResponse.data.counts.posts;
      // Be more conservative with page limits to avoid API errors
      const maxPage = Math.min(Math.ceil(totalPosts / 20), 500);
      
      // Try multiple times with different strategies if needed
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          let randomPage: number;
          
          if (attempt === 0) {
            // First attempt: random page from first half
            randomPage = Math.floor(Math.random() * Math.min(maxPage / 2, 100)) + 1;
          } else if (attempt === 1) {
            // Second attempt: random page from first 50 pages
            randomPage = Math.floor(Math.random() * Math.min(maxPage, 50)) + 1;
          } else {
            // Final attempt: first few pages only
            randomPage = Math.floor(Math.random() * Math.min(maxPage, 10)) + 1;
          }
          
          console.log(`📊 Attempt ${attempt + 1}: Found ${totalPosts} Touhou posts, fetching page ${randomPage}/${maxPage}`);
          
          // Get posts from random page with timeout
          const postsResponse: AxiosResponse<DanbooruPost[]> = await axios.get(
            `${DBOORU}/posts.json?tags=${encodeURIComponent(tags)}&page=${randomPage}&limit=20`,
            { headers, timeout: 15000 }
          );

          const posts = postsResponse.data;
          
          if (posts.length === 0) {
            console.log(`⚠️ No Touhou posts found on page ${randomPage}, trying next attempt`);
            continue;
          }

          // Get random post from the page
          const randomPost = posts[Math.floor(Math.random() * posts.length)];
          
          console.log(`🎲 Selected Touhou post #${randomPost.id} from page ${randomPage}`);
          return randomPost;
          
        } catch (pageError: any) {
          console.log(`⚠️ Attempt ${attempt + 1} failed:`, pageError.message || pageError);
          if (attempt === 2) {
            throw pageError; // Re-throw on final attempt
          }
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching Touhou image:', error);
      return null;
    }
  }

  // Fallback method using a simpler approach
  private async getFallbackTouhouImage(rating: 'safe' | 'questionable' | 'explicit' = 'safe'): Promise<DanbooruPost | null> {
    try {
      console.log('🔄 Trying fallback method with simpler query...');
      
      // Use simpler tag search based on rating
      const tags = rating === 'safe' ? 'touhou rating:safe' : 'touhou rating:explicit';
      
      // Get just the first few pages
      const randomPage = Math.floor(Math.random() * 20) + 1;
      
      console.log(`📊 Fallback: fetching page ${randomPage} with simpler tags`);
      
      const postsResponse: AxiosResponse<DanbooruPost[]> = await axios.get(
        `${DBOORU}/posts.json?tags=${encodeURIComponent(tags)}&page=${randomPage}&limit=20`,
        { headers, timeout: 10000 }
      );

      const posts = postsResponse.data;
      
      if (posts.length === 0) {
        console.log('⚠️ No posts found in fallback method');
        return null;
      }

      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      console.log(`🎲 Fallback: Selected Touhou post #${randomPost.id}`);
      return randomPost;
      
    } catch (error) {
      console.error('❌ Fallback method also failed:', error);
      return null;
    }
  }
  private async getPostInfo(postId: number): Promise<DanbooruArtistCommentary | null> {
    try {
      const response: AxiosResponse<DanbooruArtistCommentary> = await axios.get(
        `${DBOORU}/posts/${postId}/artist_commentary.json`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.log(`ℹ️ No artist commentary found for post ${postId}`);
      return null;
    }
  }

  // Post daily Touhou waifus to both SFW and NSFW channels
  public async postDailyTouhouWaifus(): Promise<void> {
    console.log('🌸 Starting daily Touhou waifu posts...');
    
    // Post to SFW channel
    await this.postToChannel('sfw', 'safe');
    
    // Wait a bit between posts
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Post to NSFW channel
    await this.postToChannel('nsfw', 'explicit');
    
    console.log('✅ Daily Touhou waifu posts completed!');
  }

  // Post to a specific channel with specific rating
  private async postToChannel(channelName: string, rating: 'safe' | 'explicit'): Promise<void> {
    try {
      const channel = await this.findChannel(channelName);
      if (!channel) {
        console.error(`❌ Could not find #${channelName} channel`);
        return;
      }

      console.log(`📤 Posting ${rating} content to #${channel.name} in ${channel.guild.name}`);

      const touhouPost = await this.getRandomTouhouImage(rating);
      if (!touhouPost) {
        console.log('🔄 Main method failed, trying fallback...');
        const fallbackPost = await this.getFallbackTouhouImage(rating);
        if (!fallbackPost) {
          await channel.send(`❌ Sorry, couldn't find a Touhou image to post today! The Danbooru API might be having issues.`);
          return;
        }
        // Use fallback post
        await this.createAndSendPost(channel, fallbackPost, rating);
        return;
      }

      await this.createAndSendPost(channel, touhouPost, rating);
      
    } catch (error) {
      console.error(`❌ Error posting to #${channelName}:`, error);
      
      // Try to send error message to channel
      const channel = await this.findChannel(channelName);
      if (channel) {
        await channel.send(`❌ Sorry, there was an error posting today's Touhou waifu. The API might be experiencing issues. Please try again later!`);
      }
    }
  }

  // Legacy method for backward compatibility and manual testing
  public async postDailyTouhouWaifu(channelName: string = 'bottests', rating: 'safe' | 'explicit' = 'safe'): Promise<void> {
    await this.postToChannel(channelName, rating);
  }

  // Create and send the post embed
  private async createAndSendPost(channel: TextChannel, touhouPost: DanbooruPost, rating: 'safe' | 'explicit' = 'safe'): Promise<void> {
    try {
      // Get additional info
      const postInfo = await this.getPostInfo(touhouPost.id);
      
      // Extract character names from tags
      const characters = touhouPost.tag_string_character
        .split(' ')
        .filter(tag => tag.length > 0)
        .map(tag => tag.replace(/_/g, ' '))
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1))
        .slice(0, 3) // Limit to 3 characters
        .join(', ');

      // Create embed with different styling based on rating
      const embed = new EmbedBuilder()
        .setColor(rating === 'safe' ? '#FF69B4' : '#FF1493')
        .setTitle(rating === 'safe' ? '🌸 Daily Touhou Waifu (SFW)' : '🔞 Daily Touhou Waifu (NSFW)')
        .setDescription(
          postInfo?.original_title || 
          (characters ? `Featuring: ${characters}` : 'A beautiful Touhou character!')
        )
        .setImage(touhouPost.file_url || touhouPost.large_file_url || touhouPost.preview_file_url || null)
        .addFields(
          {
            name: '🎯 Post ID',
            value: `#${touhouPost.id}`,
            inline: true
          },
          {
            name: '⭐ Rating',
            value: touhouPost.rating.toUpperCase(),
            inline: true
          }
        )
        .setFooter({
          text: rating === 'safe' ? `Daily Touhou SFW • Danbooru` : `Daily Touhou NSFW • Danbooru`,
          iconURL: 'https://cdn.donmai.us/original/d3/4e/d34e4cf0a437a5d65f8e82b7bcd02606.jpg'
        })
        .setTimestamp();

      // Add source if available
      if (touhouPost.source) {
        embed.addFields({
          name: '🔗 Source',
          value: touhouPost.source.length > 100 ? 
            '[Click here](' + touhouPost.source + ')' : 
            touhouPost.source,
          inline: false
        });
      }

      // Add artist commentary if available
      if (postInfo?.original_description) {
        const description = postInfo.original_description.length > 200 ? 
          postInfo.original_description.substring(0, 197) + '...' : 
          postInfo.original_description;
        
        embed.addFields({
          name: '📝 Artist Note',
          value: description,
          inline: false
        });
      }

      const contentMessage = rating === 'safe' 
        ? '🌸 **Daily Touhou Waifu (SFW) has arrived!** 🌸'
        : '🔞 **Daily Touhou Waifu (NSFW) has arrived!** 🔞';

      await channel.send({ 
        content: contentMessage,
        embeds: [embed] 
      });

      console.log(`✅ Successfully posted daily Touhou waifu #${touhouPost.id} to #${channel.name}`);
      
    } catch (error) {
      console.error('❌ Error creating/sending post:', error);
      await channel.send('❌ Sorry, there was an error formatting today\'s Touhou waifu post.');
    }
  }

  // Manual trigger for testing
}
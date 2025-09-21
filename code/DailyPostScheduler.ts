import cron, { ScheduledTask, TaskOptions } from 'node-cron';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';
import type { DailyPostsConfig, DailyPostConfig } from '../types/index.js';

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

export default class DailyPostScheduler {
  private client: Client;
  private guildId: string;
  private config: DailyPostsConfig = { dailyPosts: [] };
  private scheduledJobs: Map<string, ScheduledTask> = new Map();

  constructor(client: Client) {
    this.client = client;
    this.guildId = process.env.SWM_ID || '';
    this.loadConfig();
  }

  // Load configuration from JSON file
  private loadConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'daily-posts.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(configData) as DailyPostsConfig;
      console.log(`📄 Loaded ${this.config.dailyPosts.length} daily post configurations`);
    } catch (error) {
      console.error('❌ Error loading daily posts configuration:', error);
      this.config = { dailyPosts: [] };
    }
  }

  // Reload configuration (useful for runtime updates)
  public reloadConfig(): void {
    console.log('🔄 Reloading daily posts configuration...');
    this.loadConfig();
    this.setupSchedules();
  }

  // Initialize the scheduler
  public async init(): Promise<void> {
    console.log('🗓️ Initializing Daily Post Scheduler...');
    this.setupSchedules();
    console.log('✅ Daily Post Scheduler initialized!');
  }

  // Setup all scheduled jobs based on configuration
  private setupSchedules(): void {
    // Clear existing jobs
    this.scheduledJobs.forEach((job, id) => {
      job.destroy();
      console.log(`🗑️ Removed old schedule for ${id}`);
    });
    this.scheduledJobs.clear();

    // Create new jobs for enabled posts
    this.config.dailyPosts.forEach(postConfig => {
      if (!postConfig.enabled) {
        console.log(`⏸️ Skipping disabled post: ${postConfig.id}`);
        return;
      }

      const [hour, minute] = postConfig.time.split(':').map(Number);
      const cronExpression = `${minute} ${hour} * * *`;

      console.log(`⏰ Scheduling ${postConfig.id}: "${postConfig.title}" at ${postConfig.time} ${postConfig.timezone}`);

      const job = cron.schedule(cronExpression, async () => {
        console.log(`🎯 Running scheduled post: ${postConfig.id}`);
        await this.executePostConfig(postConfig);
      }, {
        timezone: postConfig.timezone
      } as TaskOptions);

      this.scheduledJobs.set(postConfig.id, job);
    });

    console.log(`✅ Scheduled ${this.scheduledJobs.size} daily posts`);
  }

  // Execute a specific post configuration
  private async executePostConfig(config: DailyPostConfig): Promise<void> {
    try {
      const channel = await this.findChannel(config.channel);
      if (!channel) {
        console.error(`❌ Could not find #${config.channel} channel for ${config.id}`);
        return;
      }

      console.log(`📤 Posting ${config.title} to #${channel.name}`);

      const post = await this.getRandomPost(config.tags);
      if (!post) {
        console.log('🔄 Main method failed, trying fallback...');
        const fallbackPost = await this.getFallbackPost(config.tags);
        if (!fallbackPost) {
          await channel.send(`❌ Sorry, couldn't find content for today's ${config.title}! The Danbooru API might be having issues.`);
          return;
        }
        await this.createAndSendPost(channel, fallbackPost, config);
        return;
      }

      await this.createAndSendPost(channel, post, config);
      
    } catch (error) {
      console.error(`❌ Error executing post config ${config.id}:`, error);
    }
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

  // Get a random post from Danbooru with specific tags
  private async getRandomPost(tags: string): Promise<DanbooruPost | null> {
    try {
      // Get total count of posts
      const countResponse: AxiosResponse<DanbooruCountResponse> = await axios.get(
        `${DBOORU}/counts/posts.json?tags=${encodeURIComponent(tags)}`,
        { headers, timeout: 10000 }
      );

      const totalPosts = countResponse.data.counts.posts;
      const maxPage = Math.min(Math.ceil(totalPosts / 20), 500);
      
      // Try multiple times with different strategies if needed
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          let randomPage: number;
          
          if (attempt === 0) {
            randomPage = Math.floor(Math.random() * Math.min(maxPage / 2, 100)) + 1;
          } else if (attempt === 1) {
            randomPage = Math.floor(Math.random() * Math.min(maxPage, 50)) + 1;
          } else {
            randomPage = Math.floor(Math.random() * Math.min(maxPage, 10)) + 1;
          }
          
          console.log(`📊 Attempt ${attempt + 1}: Found ${totalPosts} posts, fetching page ${randomPage}/${maxPage}`);
          
          const postsResponse: AxiosResponse<DanbooruPost[]> = await axios.get(
            `${DBOORU}/posts.json?tags=${encodeURIComponent(tags)}&page=${randomPage}&limit=20`,
            { headers, timeout: 15000 }
          );

          const posts = postsResponse.data;
          
          if (posts.length === 0) {
            console.log(`⚠️ No posts found on page ${randomPage}, trying next attempt`);
            continue;
          }

          const randomPost = posts[Math.floor(Math.random() * posts.length)];
          console.log(`🎲 Selected post #${randomPost.id} from page ${randomPage}`);
          return randomPost;
          
        } catch (pageError: any) {
          console.log(`⚠️ Attempt ${attempt + 1} failed:`, pageError.message || pageError);
          if (attempt === 2) {
            throw pageError;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching post:', error);
      return null;
    }
  }

  // Fallback method using a simpler approach
  private async getFallbackPost(tags: string): Promise<DanbooruPost | null> {
    try {
      console.log('🔄 Trying fallback method with simpler query...');
      
      // Extract just the main character/series tag and rating
      const tagParts = tags.split(' ');
      const mainTag = tagParts.find(tag => !tag.includes(':')) || tagParts[0];
      const ratingTag = tagParts.find(tag => tag.includes('rating:')) || 'rating:safe';
      const simpleTags = `${mainTag} ${ratingTag}`;
      
      const randomPage = Math.floor(Math.random() * 20) + 1;
      
      console.log(`📊 Fallback: fetching page ${randomPage} with tags: ${simpleTags}`);
      
      const postsResponse: AxiosResponse<DanbooruPost[]> = await axios.get(
        `${DBOORU}/posts.json?tags=${encodeURIComponent(simpleTags)}&page=${randomPage}&limit=20`,
        { headers, timeout: 10000 }
      );

      const posts = postsResponse.data;
      
      if (posts.length === 0) {
        console.log('⚠️ No posts found in fallback method');
        return null;
      }

      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      console.log(`🎲 Fallback: Selected post #${randomPost.id}`);
      return randomPost;
      
    } catch (error) {
      console.error('❌ Fallback method also failed:', error);
      return null;
    }
  }

  // Get additional info for the post
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

  // Create and send the post embed
  private async createAndSendPost(channel: TextChannel, post: DanbooruPost, config: DailyPostConfig): Promise<void> {
    try {
      const postInfo = await this.getPostInfo(post.id);
      
      // Extract character names from tags
      const characters = post.tag_string_character
        .split(' ')
        .filter(tag => tag.length > 0)
        .map(tag => tag.replace(/_/g, ' '))
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1))
        .slice(0, 3)
        .join(', ');

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(config.color as any)
        .setTitle(`${config.emoji} ${config.title} ${config.rating === 'explicit' ? '(NSFW)' : '(SFW)'}`)
        .setDescription(
          postInfo?.original_title || 
          (characters ? `Featuring: ${characters}` : `Beautiful content from Danbooru!`)
        )
        .setImage(post.file_url || post.large_file_url || post.preview_file_url || null)
        .addFields(
          {
            name: '🎯 Post ID',
            value: `#${post.id}`,
            inline: true
          },
          {
            name: '⭐ Rating',
            value: post.rating.toUpperCase(),
            inline: true
          }
        )
        .setFooter({
          text: `${config.title} • Danbooru`,
          iconURL: 'https://cdn.donmai.us/original/d3/4e/d34e4cf0a437a5d65f8e82b7bcd02606.jpg'
        })
        .setTimestamp();

      // Add source if available
      if (post.source) {
        embed.addFields({
          name: '🔗 Source',
          value: post.source.length > 100 ? 
            '[Click here](' + post.source + ')' : 
            post.source,
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

      const contentMessage = `${config.emoji} **${config.title} has arrived!** ${config.emoji}`;

      await channel.send({ 
        content: contentMessage,
        embeds: [embed] 
      });

      console.log(`✅ Successfully posted ${config.title} #${post.id} to #${channel.name}`);
      
    } catch (error) {
      console.error(`❌ Error creating/sending post for ${config.id}:`, error);
      await channel.send(`❌ Sorry, there was an error formatting today's ${config.title}.`);
    }
  }

  // Manual trigger for specific post by ID
  public async triggerPost(postId: string): Promise<boolean> {
    const config = this.config.dailyPosts.find(p => p.id === postId);
    if (!config) {
      console.error(`❌ Post configuration not found: ${postId}`);
      return false;
    }

    console.log(`🔧 Manual trigger for ${config.title}`);
    await this.executePostConfig(config);
    return true;
  }

  // Manual trigger for all enabled posts
  public async triggerAllPosts(): Promise<void> {
    console.log('🔧 Manual trigger for all enabled daily posts');
    const enabledPosts = this.config.dailyPosts.filter(p => p.enabled);
    
    for (let i = 0; i < enabledPosts.length; i++) {
      await this.executePostConfig(enabledPosts[i]);
      
      // Wait between posts to avoid rate limiting
      if (i < enabledPosts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // Get list of configured posts
  public getPostConfigs(): DailyPostConfig[] {
    return this.config.dailyPosts;
  }

  // Legacy methods for backward compatibility
  public async postDailyTouhouWaifus(): Promise<void> {
    const touhouPosts = this.config.dailyPosts.filter(p => 
      p.enabled && p.id.includes('touhou')
    );
    
    for (let i = 0; i < touhouPosts.length; i++) {
      await this.executePostConfig(touhouPosts[i]);
      if (i < touhouPosts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  public async postDailyTouhouWaifu(channelName: string = 'bottests', rating: 'safe' | 'explicit' = 'safe'): Promise<void> {
    // Create a temporary config for backward compatibility
    const tempConfig: DailyPostConfig = {
      id: 'temp_test',
      title: 'Daily Touhou Test',
      channel: channelName,
      tags: rating === 'safe' ? 'touhou rating:safe score:>10' : 'touhou rating:explicit score:>5',
      rating: rating,
      time: '00:00',
      timezone: 'Asia/Tokyo',
      enabled: true,
      emoji: rating === 'safe' ? '🌸' : '🔞',
      color: rating === 'safe' ? '#FF69B4' : '#FF1493'
    };
    
    await this.executePostConfig(tempConfig);
  }
}
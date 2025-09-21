import dotenv from 'dotenv';
dotenv.config();

import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch-commonjs';

// Tumblr API response types
interface TumblrPhoto {
  original_size: {
    url: string;
    width: number;
    height: number;
  };
}

interface TumblrPost {
  type: string;
  caption?: string;
  photos?: TumblrPhoto[];
}

interface TumblrBlogInfo {
  response: {
    blog: {
      total_posts: number;
    };
  };
}

interface TumblrPostsResponse {
  response: {
    posts: TumblrPost[];
  };
}

const command = {
  data: new SlashCommandBuilder()
    .setName('randomduo')
    .setDescription('Gets a random image from the WTFDuolingo Tumblr page.'),
  
  async execute(interaction: CommandInteraction): Promise<void> {
    try {
      const apiKey = process.env.TUMBLR_API_KEY;
      
      if (!apiKey) {
        await interaction.reply({
          content: 'Tumblr API key is not configured.',
          ephemeral: true
        });
        return;
      }

      // Get blog info
      const response = await fetch(`https://api.tumblr.com/v2/blog/wtfduolingo.tumblr.com/info?api_key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as TumblrBlogInfo;
      const totalPosts = data.response.blog.total_posts;
      const randomPage = Math.floor(Math.random() * Math.min(Math.floor(totalPosts / 20), 125));
      const url = `https://api.tumblr.com/v2/blog/wtfduolingo.tumblr.com/posts?api_key=${apiKey}&offset=${randomPage * 20}`;
      
      // Get posts
      const response2 = await fetch(url);
      
      if (!response2.ok) {
        throw new Error(`HTTP error! status: ${response2.status}`);
      }
      
      const data2 = await response2.json() as TumblrPostsResponse;
      const posts = data2.response.posts;

      // Filter out posts that do not contain images
      const imagePosts = posts.filter(post => post.type === 'photo' && post.photos && post.photos.length > 0);

      if (imagePosts.length === 0) {
        await interaction.reply('No image posts found!');
        return;
      }

      // Select a random post with images
      const randomPost = imagePosts[Math.floor(Math.random() * imagePosts.length)];
      const imageUrls = randomPost.photos!.map(photo => photo.original_size.url);
      const postDescription = randomPost.caption ? randomPost.caption.replace(/<[^>]*>?/gm, '') : '';

      // Create a new EmbedBuilder with the image URL and post description
      const embed = new EmbedBuilder()
        .setTitle('Duolingo WTF')
        .setDescription(postDescription.slice(0, 4096)) // Discord embed description limit
        .setColor('#1E324B')
        .setImage(imageUrls[0]);

      // Send the embed to the Discord channel
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching Duolingo post:', error);
      await interaction.reply({
        content: 'Sorry, I couldn\'t fetch a Duolingo post right now. Please try again later!',
        ephemeral: true
      });
    }
  },
};

export default command;
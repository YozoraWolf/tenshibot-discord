const dotenv = require("dotenv");
dotenv.config();

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch-commonjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomduo')
    .setDescription('Gets a random image from the WTFDuolingo Tumblr page.'),
  async execute(interaction) {
    const apiKey = process.env.TUMBLR_API_KEY;
    const response = await fetch(`https://api.tumblr.com/v2/blog/wtfduolingo.tumblr.com/info?api_key=${apiKey}`);
    const data = await response.json();
    const totalPosts = data.response.blog.total_posts;
    const randomPage = Math.floor(Math.random() * Math.min(Math.floor(totalPosts / 20), 125));
    const url = `https://api.tumblr.com/v2/blog/wtfduolingo.tumblr.com/posts?api_key=${apiKey}&offset=${randomPage * 20}`;
    
    const response2 = await fetch(url);
    const data2 = await response2.json();
    const posts = data2.response.posts;



    // Filter out posts that do not contain images
    const imagePosts = posts.filter(post => post.type === 'photo');

    if (imagePosts.length === 0) {
      // If there are no posts with images, send a message to the Discord channel
      return interaction.reply('No image posts found!');
    }

    // Select a random post with images
    const randomPost = imagePosts[Math.floor(Math.random() * imagePosts.length)];
    const imageUrls = randomPost.photos.map(photo => photo.original_size.url);
    const postDescription = randomPost.caption ? randomPost.caption.replace(/<[^>]*>?/gm, '') : '';

    // Create a new Embedbuilder with the image URL and post description
    const embed = new EmbedBuilder()
      .setTitle('Duolingo WTF')
      .setDescription(postDescription)
      .setColor('#1E324B')
      .setImage(imageUrls[0]);

    // Send the embed to the Discord channel
    interaction.reply({ embeds: [embed] });
  },
};
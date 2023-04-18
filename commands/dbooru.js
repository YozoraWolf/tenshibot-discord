const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction, EmbedBuilder } = require('discord.js');
const Utils = require('../utils');
const { get } = require('request');
const axios = require('axios');

const DBOORU = "https://testbooru.donmai.us";
//const DBOORU = "https://danbooru.donmai.us";
const headers = {
    "Referer": DBOORU,
    "Content-Type": "application/json"
  };

const getMaxPagesForTags = async (tagNames, postsPerPage = 20) => {
    const tagString = tagNames.join('+');
    try {
      const response = await axios.get(`${DBOORU}/tags.json?search[name_matches]=${tagString}`, { headers });

      const tags = response.data;
      const postCount = tags.reduce((sum, tag) => sum + tag.post_count, 0);
      const maxPages = Math.ceil(postCount / postsPerPage);
      return maxPages;
    } catch (error) {
      console.error(error);
    }
  };

const getPost = async (tags, pageMax) => {
    console.log(`${DBOORU}/posts.json?tags=${tags}&page=${Utils.getRandom(1, Math.ceil(pageMax))}`);
    let {data} = await axios.get(`${DBOORU}/posts.json?tags=${tags}&page=${Utils.getRandom(1, Math.ceil(pageMax))}`, { headers });
    return data;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dbooru')
        .setDescription('Get a random image from Danbooru with the specified tags')
        .addStringOption(option => 
            option.setName('tag1')
                .setDescription('the first tag to search for')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('tag2')
                .setDescription('the second tag to search for')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('rating')
                .setDescription('The rating you are searching for (g/q/e)')
                .setRequired(false)
                .addChoices(
                    { name: 'Any', value: '*' },
                    { name: 'Safe', value: 'general' },
                    { name: 'Questionable', value: 'questionable' },
                    { name: 'Explicit', value: 'explicit' }
                )),
    async execute(interaction = CommandInteraction) {
        let tags = [interaction.options.getString('tag1')?.split(" ")[0], interaction.options.getString('tag2')?.split(" ")[0], interaction.options.getString('rating')?.split(" ")[0]]
            .map(s => {
                if(s === undefined) {
                    return "";
                }
                return s;
            });

        console.log(tags);

        let pageMax = await getMaxPagesForTags([tags[0], tags[1]], 20);

        //let pageMax = (await Utils.httpReq(`${DBOORU}/counts/posts.json?tags=${tags}`)).counts.posts / 20;
        // Prevent it from going above the API Max (1000)
        pageMax = pageMax > 1000 ? 999 : pageMax;

        const max_retries = 5;
        let retries = 0;
        let rPosts = undefined;
        let rPost = undefined;

        await interaction.reply("Ok, wait a moment");

        do {
            rPosts = await getPost(`${tags[0]}+${tags[1]}`, pageMax);
            
            if(!['', '*'].includes(tags[2].charAt(0)))
                rPosts = rPosts.filter(p => p.rating.charAt(0) === tags[2].charAt(0));
            
            console.log("Len: ", rPosts.length);
            rPost = rPosts[Utils.getRandom(0,rPosts.length-1)];

            retries++;
            if(rPost === undefined) break;
            if(retries >= max_retries) break;
            if(['', '*'].includes(tags[2].charAt(0))) break;
        } while(rPosts.length === 0);

        if(retries === max_retries) {
            await interaction.editReply({
                content: "Sorry, I couldn't find anything with that rating, try something else.",
                ephemeral: true
            });
        }

        if(rPost === undefined) {
            await interaction.editReply({
                content: "Sorry, I couldn't find anything with that, try something else.",
                ephemeral: true
            });
        }

        const {data: rPostTitle} = await axios.get(`${DBOORU}/posts/${rPost.id}/artist_commentary.json`, { headers });

        const embed = new EmbedBuilder()
            .setColor('#007FFF')
            .setTitle(rPostTitle.original_title || `Post #${rPost.id}`)
            .setDescription(`${rPostTitle.original_description}\nSource: ${rPost.source}` || '')
            .setImage(rPost.preview_file_url)
            .setFooter({text: `Danbooru`});

        await interaction.editReply({
            embeds: [embed],
            });
    }
};

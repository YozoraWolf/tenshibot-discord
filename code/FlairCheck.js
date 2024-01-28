require('dotenv').config();
const Flairs = require('../data/flairs.json');

class FlairCheck {

    client = undefined;

    static async init(client) {
        this.client = client;
        this.guild = await this.client.guilds.fetch(process.env.SWM_ID);

        // Check for the #flairs channel
        let flairCh = await this.guild.channels.cache.find(ch => ch.name === "flairs");

        // If roles found in "Flairs" const variable do not exist in guild, create them
        for (const flair of Flairs) {
            let role = await this.guild.roles.cache.find(r => r.name === flair.name);
            if(role === undefined) {
                await this.guild.roles.create({
                        name: flair.name,
                        color: flair.color,
                        reason: "Flair"
                    });
            }
        }

        // If channel exists, check for the flair roles on the "Flairs" const variable and set reactions on the message get emojis from the "Flairs" const variable
        if(flairCh !== undefined) {
            let flairMess = (await flairCh.messages.fetch({after:0, limit: 5})).first(2)[0];
            if(flairMess === undefined) {
                console.error("ERROR: Flair Message not found!");
                // If message doesn't exist create it
                flairMess = await flairCh.send("React to this message to get your flair! You will be able to change it at any time and it will allow you to get pinged for news and events for the topics you like!");
            } else {
                await flairMess.edit("React to this message to get your flair! You will be able to change it at any time and it will allow you to get pinged for news and events for the topics you like!");
            }

            for (const flair of Flairs) {
                let ico = await this.guild.emojis.cache.find(emoji => emoji.name === flair.ico);
                try {
                    await flairMess.react(ico != undefined ? ico : `${flair.ico}`);
                } catch (error) {
                    console.error(error);
                }
            }

            this.client.on('messageReactionAdd', (react, user) => {
                if(react.message.id !== flairMess.id) return;
                for (const flair of Flairs) {
                    if(react.emoji.name === flair.ico) {
                        let gUser = this.guild.members.cache.find(u => u.id === user.id);
                        gUser.roles.add([this.guild.roles.cache.find(r => r.name === flair.name).id]);
                    }
                }
            });

            this.client.on('messageReactionRemove', (react, user) => {
                if(react.message.id !== flairMess.id) return;
                for (const flair of Flairs) {
                    if(react.emoji.name === flair.ico) {
                        let gUser = this.guild.members.cache.find(u => u.id === user.id);
                        gUser.roles.remove([this.guild.roles.cache.find(r => r.name === flair.name).id]);
                    }
                }
            });
        }

        console.log("✅ Initialized Flair Check.");

    }
}

module.exports = FlairCheck;
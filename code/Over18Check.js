require('dotenv').config();
const Strings = require('../data/strings.json');

class Over18Check {

    client = undefined;

    static async init(client) {
        this.client = client;
        this.guild = await this.client.guilds.fetch(process.env.SWM_ID);

        // Check for the #flairs channel
        let flairCh = await this.guild.channels.cache.find(ch => ch.name === "flairs");
        let overMess = undefined;
        if(flairCh !== undefined) {
          // Get the second sent message on the channel flairCh
          overMess = (await flairCh.messages.fetch({after: 0, limit: 5})).first(2)[1];
          if(overMess === undefined) {
              console.error("ERROR: Over 18 Message not found! Creating...");
              // If message doesn't exist create it
              overMess = await flairCh.send(Strings.nsfw);
          } else {
            await overMess.edit(Strings.nsfw);
          }
        }


        let nsfw = await this.guild.roles.cache.find(r => r.name === "NSFW");
        if(nsfw === undefined) {
            this.createNSFWRole(); 
        } else {
            this.updateNSFWDisclaimer(overMess);
        }

        await overMess.react('🔞');
        
        this.client.on('messageReactionAdd', (react, user) => {
            if(react.message.id !== overMess.id) return;
            let gUser = this.guild.members.cache.find(u => u.id === user.id);
            if(react.emoji.name === '🔞') {
                gUser.roles.add([this.guild.roles.cache.find(r => r.name === "NSFW").id]);
            }
        });

        this.client.on('messageReactionRemove', (react, user) => {
            if(react.message.id !== overMess.id) return;
            let gUser = this.guild.members.cache.find(u => u.id === user.id);
            if(react.emoji.name === '🔞') {
                gUser.roles.remove([this.guild.roles.cache.find(r => r.name === "NSFW").id]);
            }
        });

        console.log("✅ Initialized Over 18 Check.");
    }

    static async createNSFWRole() {
        await this.guild.roles.create({
                name: "NSFW",
                color: "#780000",
                reason: "NSFW"
        });
    }

    static async updateNSFWDisclaimer(overMess) {
        if(overMess === undefined) {
            console.error("ERROR: NSFW Message not found!");
            return;
        }
        overMess.edit(Strings.nsfw);

        this.client.on('messageReactionAdd', async (react, user) => {
            if (react.message.id !== overMess.id) return;
            let gUser = await this.guild.members.fetch(user.id);
            if (react.emoji.name === '🔞') {
              try {
                console.log("Added role to " + gUser.user.username);
                gUser.roles.add(this.guild.roles.cache.find(r => r.name === "NSFW").id);
              } catch(e) {
                console.error("Could not change role!\nE: ",e)
              }
            }
          });
          
          this.client.on('messageReactionRemove', async (react, user) => {
            if (react.message.id !== overMess.id) return;
            let gUser = await this.guild.members.fetch(user.id);
            if (react.emoji.name === '🔞') {
              try {
                console.log("Removed role from " + gUser.user.username);
                gUser.roles.remove(this.guild.roles.cache.find(r => r.name === "NSFW").id);
              } catch(e) {
                console.error("Could not change role!\nE: ",e)
              }
            }
          });
    }
}

module.exports = Over18Check;

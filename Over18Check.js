require('dotenv').config();
const Strings = require('./strings.json');

class Over18Check {

    client = undefined;

    static async init(client) {
        this.client = client;
        this.guild = await this.client.guilds.fetch(process.env.SWM_ID);


        let nsfw = await this.guild.roles.cache.find( r => r.name === "NSFW");
        if(nsfw === undefined) {
            this.createNSFWRole(); 
        } else {
            this.updateNSFWDisclaimer();
        }

        console.log("Initialized Over 18 Check.");
    }

    static async createNSFWRole() {
        await this.guild.roles.create({
            data: {
                name: "NSFW",
                color: "#780000",
                reason: "NSFW"
            }
        });

        let rulesCh = await this.guild.channels.cache.find(ch => ch.name === "rules");
        let mess = await rulesCh.send(Strings.nsfw);
        await mess.react('🔞');
        
        this.client.on('messageReactionAdd', (react, user) => {
            if(react.message.id !== mess.id) return;
            let gUser = this.guild.members.cache.find(u => u.id === user.id);
            if(react.emoji.name === '🔞') {
                gUser.roles.set([this.guild.roles.cache.find(r => r.name === "NSFW").id]);
            }
        });

        this.client.on('messageReactionRemove', (react, user) => {
            if(react.message.id !== mess.id) return;
            let gUser = this.guild.members.cache.find(u => u.id === user.id);
            if(react.emoji.name === '🔞') {
                gUser.roles.remove([this.guild.roles.cache.find(r => r.name === "NSFW").id]);
            }
        });
    }

    static async updateNSFWDisclaimer() {
        let nsfwDiscMess = (await this.guild.channels.cache.find(ch => ch.name === "rules").messages.fetch({limit: 5})).first(2)[0];
        //console.log(nsfwDiscMess);
        if(nsfwDiscMess === undefined) {
            console.error("ERROR: NSFW Message not found!");
            return;
        }
        nsfwDiscMess.edit(Strings.nsfw);

        this.client.on('messageReactionAdd', async (react, user) => {
            if (react.message.id !== nsfwDiscMess.id) return;
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
            if (react.message.id !== nsfwDiscMess.id) return;
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

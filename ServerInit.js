import dotenv from 'dotenv';
dotenv.config();
import Strings from "./strings.json" assert { type: "json" };

export default class ServerInit {

    client = undefined;
    guild = undefined;

    static async init(client) {
        this.client = client;
        this.guild = await this.client.guilds.fetch(process.env.SWM_ID);
        
        


        await this.checkInitChannel();

        this.client.on('guildMemberAdd', m => {
            m.roles.add(this.guild.roles.cache.find( r => r.name === "New"));
        });

        console.log("Initialized Server Init.");
    }

    static async checkInitChannel() {
        
        let init = await this.guild.channels.cache.find( c => c.name === "init");
        //console.log("Init: ", init);
        if(init === undefined) {
            let newRole = await this.guild.roles.create({
                data: {
                    name: "New",
                    color: "#FFFFFF",
                    reason: "New"
                }
                
            });

            //console.log("NEW ROLE: ", newRole);
            this.createInitChannel(newRole);
        } else {
            this.updateRulesMessage();
        }
    }

    static async createInitChannel(newRole) {
        console.log("Init channel does not exist, creating...");
        let channel = await this.guild.channels.create("init", {
            parent: process.env.SWM_CAT_ID,
            permissionOverwrites: [
                {
                    id: newRole.id,
                    allow: ["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"]
                }]
        });

        let mess = await channel.send(Strings.rules+"\n\nIf you agree to the rules, please click on the check mark.");
        await mess.react('✅');
        await mess.react('❎');
        
        this.client.on('messageReactionAdd', (react, user) => {
            if(react.message.id !== mess.id) return;
            let gUser = this.guild.members.cache.find(u => u.id === user.id);
            if(react.emoji.name === '✅') {
                gUser.roles.set([this.guild.roles.cache.find(r => r.name === "Guest").id]);
            } else if(react.emoji.name === '❎') {
                gUser.kick("Member disagreed to rules.")
            }
        });

    }

    static async updateRulesMessage() {
        let agreeMess = (await this.guild.channels.cache.find(ch => ch.name === "init").messages.fetch({limit: 1})).first();
        agreeMess.edit(Strings.rules+"\n\nIf you agree to the rules, please click on the check mark.");

        this.client.on('messageReactionAdd', (react, user) => {
            if(react.message.id !== agreeMess.id) return;
            let gUser = this.guild.members.cache.find(u => u.id === user.id);
            if(react.emoji.name === '✅') {
                gUser.roles.set([this.guild.roles.cache.find(r => r.name === "Guest").id]);
            } else if(react.emoji.name === '❎') {
                gUser.kick("Member disagreed to rules.")
            }
        });
    }

}
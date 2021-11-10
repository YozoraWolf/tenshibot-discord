import BOT_VARS from "./BOT_VARS.js";
import kick_lines from "./kick_lines.json";
import TZones from "./timezones.json";
import moment from 'moment-timezone';
import Utils from "./Utils.js";
import Jimp from "jimp";
import * as canvas from 'canvas';
import { Permissions } from "discord.js";

export default class TenshiInteract {

    // Main Vars
    client = undefined;
    guild = undefined;

    // Misc Vars
    kebab = ["https://www.youtube.com/watch?v=ocW3fBqPQkU"];

    static async init(client) {
        this.client = client;
        this.guild = await this.client.guilds.fetch(BOT_VARS.swm_id);
        this.client.on('message', (msg) => {
            if(msg.author.username === "Tenshi") return;
            //if(msg.content.match()) this.checkGreet(msg);

            if (msg.content.toLowerCase().split(" ")[0] == "!t") {
                let cmd = msg.content.toLowerCase().split(" ")[1];
                switch(cmd) {
                    case "mta":
                        this.checkServerAddress(msg);
                        break;
                    case "time":
                        this.checkTime(msg, msg.content.toLowerCase().split(" ")[2]);
                        break;
                    case "kebab":
                        this.checkKebab(msg);
                        break;
                    case "sanae":
                        this.checkSanaeDialog(msg, msg.content.split(" ").slice(2).join(" "));
                        break;
                    case "tenshisign":
                        this.checkTenshiSign(msg, msg.content.split(" ").slice(2).join(" "));
                        break;
                    //ADMIN ONLY
                    case "kick":
                        this.kickMember(msg, msg.content.toLowerCase().split(" ")[2]);
                        break;
                    case "snick":
                        this.checkSetNick(msg, msg.content.toLowerCase().split(" ")[2], msg.content.toLowerCase().split(" ")[3]);
                        break;
                    case "db":
                        this.checkDB(msg, msg.content.toLowerCase().split(" ").slice(2).join(" "));
                        break;
                    case "flip":
                        this.checkCoinFlip(msg);
                        break;
                }
            }
        });

        console.log("Initialized Tenshi Interact.");
    }

    static checkServerAddress(msg) {
        msg.reply("That's coming soon!");
    }

    static checkTime(msg, tz) {
        let tzone = TZones.find(z => z.value.toLowerCase().match(tz));
        if(tzone !== undefined) {
            msg.reply("The time in **"+tzone.name+"** is **"+moment().tz(tzone.value).format("hh:mm a")+"**");
        } else {
            msg.reply("Sorry, I couldn't find that timezone");
        }
    }

    static checkKebab(msg) {
        msg.reply(msg, "REMOVE KEBAB! \n " + this.kebab[Utils.getRandom(0,this.kebab.length)]);
    }

    static checkSanaeDialog(msg, speech) {
        if (speech.length > 213) {
            Utils.sendMessage(msg, "The message is too long for sanae to say, please shorten it to 213 characters!");
            return 0;
        }
        Jimp.read("images/sanae.jpg")
            .then(image => {
            // Do stuff with the image.
            Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(font => {
                image.print(font, 10, 30, speech, 275);
                image.getBuffer(Jimp.MIME_JPEG, function (err, buff) {
                    Utils.sendBuffImage(msg, "Here you go ~", buff, null, false);
                });
            });
        })
            .catch(err => {
            // Handle an exception.
            console.log("Couldn't make sanae image.\nE: " + err.message);
        });
    }

     static async checkTenshiSign(msg, sign) {
        if (sign.length > 45) {
            Utils.sendMessage(msg, "The message is too long for me to hold, please shorten it to 45 characters!");
            return;
        }

        // Do stuff with the image.
        let tenImg = await Jimp.read("images/tenshi.jpg");
        let txtImg = await Jimp.create(300, 150);
        let font = await Jimp.loadFont("fonts/impact.ttf.fnt");
        txtImg.print(font, 15, 30, sign, 260, 150).rotate(8);
        tenImg.blit(txtImg, 0, 0);
        tenImg.getBuffer(Jimp.MIME_JPEG, function (err, buff) {
            Utils.sendBuffImage(msg, "Here you go ~", buff, null, false);
        });
    }

    static async kickMember(msg, name) {

        let author = (await this.guild.members.fetch({query: msg.author.username, limit: 1})).first();
        let member = (await this.guild.members.fetch({query: name, limit: 1})).first();

        if(!author.permissions.has("KICK_MEMBERS")) {
            Utils.sendMessage(msg, "It seems you don't have enough permission to do that.");
        }
        name = name.trim() // trim whitespaces if possible
        //console.log("Guild Size: ", this.guild.members.cache.size);
        //console.log("FOUND: ", member);
        if(member === undefined) {
            Utils.sendMessage(msg, "I couldn't find any member with a nick/username close to that, sorry.");
            return;
        }
        member.kick();
        Utils.sendMessage(msg, `Kicked ${member.user.username}, ${kick_lines[Utils.getRandom(0, kick_lines.length-1)]}`);
    }

    static async checkSetNick(msg, name, toNick) {

        let author = (await this.guild.members.fetch({query: msg.author.username, limit: 1})).first();
        let member = (await this.guild.members.fetch({query: name, limit: 1})).first();
        
        if(!author.permissions.has("MANAGE_NICKNAMES")) {
            Utils.sendMessage(msg, "It seems you don't have enough permission to do that.");
            return;
        }
        if(member === undefined) {
            Utils.sendMessage(msg, "I couldn't find any member with a nick/username close to that, sorry.");
            return;
        }
        member.edit({nick: toNick});
        Utils.sendMessage(msg, `Successfully changed **${member.user.username}**'s nick to '**${toNick}**'`);

    }

    static async checkDB(msg, tags) {
        if(tags.split(" ").length > 2) {
            Utils.sendMessage(msg, "You can't specify more than 2 tags in Danbooru!\nPlease narrow down to 2 tags!");
            return;
        }
        //console.log("tags: ", tags);
        let pageMax = (await Utils.httpReq(`https://danbooru.donmai.us/counts/posts.json?tags=${tags}`)).counts.posts / 20;
        // Prevent it from going above the API Max (1000)
        pageMax = pageMax > 1000 ? 999 : pageMax;
        let req = (await Utils.httpReq(`https://danbooru.donmai.us/posts.json?tags=${tags}&page=${Utils.getRandom(1, Math.ceil(pageMax))}`, "GET"));
        //console.log("Page Max: ", Math.ceil(pageMax));
        if(req.length === 0) {
            Utils.sendMessage(msg, "Sorry, I couldn't find anything with that, try something else.");
            return;
        }
        //console.log(req);
        let rPost = req[Utils.getRandom(0,req.length-1)];
        let rPostTitle = (await Utils.httpReq(`https://danbooru.donmai.us/posts/${rPost.id}/artist_commentary.json`));
        Utils.sendEmbed(msg, {
            title: (![null, undefined, ""].includes(rPostTitle.original_title)) ? rPostTitle.original_title : "Post #"+rPost.id,
            description: (![null, undefined, ""].includes(rPostTitle.original_description)) ? rPostTitle.original_description : "",
            image: {url: rPost.file_url},
            color: "#007FFF"
        });
    }

    static async checkCoinFlip(msg) {
        let th = Utils.getRandom(0,1);
        console.log("TH: ", th);
        let m = await Utils.sendMessage(msg, `Flipped the coin and the result is...`);
        setTimeout(() => {m.edit(m.content+` **${th === 0 ? "Heads!" : "Tails!"}**`)}, 2000);
    }


    

}
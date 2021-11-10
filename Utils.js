import { DiscordAPIError, MessageAttachment, MessageEmbed } from 'discord.js';
import https from 'https';

export default class Utils {


    static async httpReq(url, method, body) {

        url = new URL(url);
        const options = {
            host: url.hostname,
            path: url.pathname+url.search,
            port: 443,
            method: method,
            headers: {
            'Content-Type': 'application/json'
            }
        };
        //console.log("[OPT] ", options);
        return new Promise((resolve, rej) => {
            let output = "";
            const req = https.request(options, (res) => {
                //console.log(`[FETCH] ${options.host} : ${res.statusCode}`);
                res.setEncoding('utf8');
            
                res.on('data', (chunk) => {
                    output += chunk;
                });
            
                res.on('end', () => {
                    let obj = JSON.parse(output);
                
                    resolve(obj);
                });
            });
            
            req.on('error', (err) => {
                resolve(undefined);
            });
            
            req.end();
            
        });
    }

    static getRandom(min, max) {
        return Math.floor(Math.random() * (Math.floor(max) - Math.floor(min) + 1)) + Math.floor(min);
    }

    static async sendMessage(msg, string) {
        if (msg != undefined && string != undefined) {
            if (msg.guild != undefined) {
                console.log("Public: " + string);
                return msg.channel.send(string);
            }
            else {
                console.log("Private: " + string);
                return msg.reply(string);
            }
        }
    }

    static sendBuffImage(msg, string, buff, mention, tts) {
        if (msg.guild != undefined) {
            //msg.channel.sendFile(buffer, undefined, ); // Stream
            msg.channel.send(string, new MessageAttachment(buff));
        }
        else {
            msg.reply(string, new MessageAttachment(buff));
        }
        console.log("[SUCCESS] Buffered image sent!");
    }

    static sendEmbed(msg, e) {
        let embed = new MessageEmbed(e);
        msg.channel.send({embed: embed});
    }
}
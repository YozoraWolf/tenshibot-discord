const { MessageAttachment, MessageEmbed } = require('discord.js');
const https = require('https');

module.exports = class Utils {
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
        return new Promise((resolve, rej) => {
            let output = "";
            const req = https.request(options, (res) => {
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

    static setIntervalX(f, ms, x, cb) {
        let i = 0;
        let inter = setInterval(() => {
            f();
            ++i;
            if(x === i) {
                clearInterval(inter);
                cb();
            }
        }, ms);
    }

    static getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static convertSecondsToTime(seconds) {
        if (seconds < 60) {
          return `${seconds} seconds`;
        } else if (seconds < 3600) {
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          return `${minutes} minutes, ${remainingSeconds} seconds`;
        } else if (seconds < 86400) {
          const hours = Math.floor(seconds / 3600);
          const remainingSeconds = seconds % 3600;
          const minutes = Math.floor(remainingSeconds / 60);
          const remainingSeconds2 = remainingSeconds % 60;
          return `${hours} hours, ${minutes} minutes, ${remainingSeconds2} seconds`;
        } else {
          const days = Math.floor(seconds / 86400);
          const remainingSeconds = seconds % 86400;
          const hours = Math.floor(remainingSeconds / 3600);
          const remainingSeconds2 = remainingSeconds % 3600;
          const minutes = Math.floor(remainingSeconds2 / 60);
          const remainingSeconds3 = remainingSeconds2 % 60;
          return `${days} days, ${hours} hours, ${minutes} minutes, ${remainingSeconds3} seconds`;
        }
      }

      static isValidDate(day, month, year) {
        // Check if year is a leap year
        const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        
        // Determine the maximum number of days for the given month and year
        const maxDays = [
          31,
          isLeapYear ? 29 : 28, // February
          31,
          30,
          31,
          30,
          31,
          31,
          30,
          31,
          30,
          31
        ][month - 1];
      
        // Check if the day is within the valid range for the given month and year
        return day >= 1 && day <= maxDays;
      }

}
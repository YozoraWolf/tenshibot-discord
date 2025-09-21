import { EmbedBuilder, Message, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import https from 'https';

type MessageChannel = TextChannel | DMChannel | NewsChannel;

export default class Utils {
  static async httpReq(url: string, method = 'GET', body?: any): Promise<any> {
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      host: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      port: 443,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      let output = '';
      const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          output += chunk;
        });
        res.on('end', () => {
          try {
            const obj = JSON.parse(output);
            resolve(obj);
          } catch (error) {
            resolve(undefined);
          }
        });
      });
      
      req.on('error', (err) => {
        resolve(undefined);
      });
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  static getRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (Math.floor(max) - Math.floor(min) + 1)) + Math.floor(min);
  }

  static async sendMessage(msg: Message, string: string): Promise<Message | undefined> {
    if (msg !== undefined && string !== undefined) {
      if (msg.guild !== undefined) {
        console.log('Public: ' + string);
        return (msg.channel as MessageChannel).send(string);
      } else {
        console.log('Private: ' + string);
        return msg.reply(string);
      }
    }
    return undefined;
  }

  static sendBuffImage(msg: Message, string: string, buff: Buffer, mention?: any, tts?: boolean): void {
    if (msg.guild !== undefined) {
      (msg.channel as MessageChannel).send({
        content: string,
        files: [{ attachment: buff, name: 'image.jpg' }]
      });
    } else {
      msg.reply({
        content: string,
        files: [{ attachment: buff, name: 'image.jpg' }]
      });
    }
    console.log('[SUCCESS] Buffered image sent!');
  }

  static sendEmbed(msg: Message, embedData: any): void {
    const embed = new EmbedBuilder(embedData);
    (msg.channel as MessageChannel).send({ embeds: [embed] });
  }

  static setIntervalX(f: () => void, ms: number, x: number, cb: () => void): void {
    let i = 0;
    const inter = setInterval(() => {
      f();
      ++i;
      if (x === i) {
        clearInterval(inter);
        cb();
      }
    }, ms);
  }

  static getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  static convertSecondsToTime(seconds: number): string {
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

  static isValidDate(day: number, month: number, year: number): boolean {
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
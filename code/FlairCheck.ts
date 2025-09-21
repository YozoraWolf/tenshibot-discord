import dotenv from 'dotenv';
dotenv.config();

import { Client, Guild, TextChannel, MessageReaction, PartialMessageReaction, User, PartialUser, GuildEmoji } from 'discord.js';
import { FlairData } from '../types/index';

const Flairs: FlairData[] = require('../data/flairs.json');

class FlairCheck {
  private static client: Client | undefined = undefined;
  private static guild: Guild | undefined = undefined;

  static async init(client: Client): Promise<void> {
    this.client = client;
    if (process.env.SWM_ID) {
      this.guild = await this.client.guilds.fetch(process.env.SWM_ID);
    }

    if (!this.guild) return;

    // Check for the #flairs channel
    const flairCh = this.guild.channels.cache.find(ch => ch.name === 'flairs') as TextChannel | undefined;

    // If roles found in "Flairs" const variable do not exist in guild, create them
    for (const flair of Flairs) {
      const role = this.guild.roles.cache.find(r => r.name === flair.name);
      if (role === undefined) {
        await this.guild.roles.create({
          name: flair.name,
          color: flair.color as any,
          reason: 'Flair'
        });
      }
    }

    // If channel exists, check for the flair roles on the "Flairs" const variable and set reactions on the message get emojis from the "Flairs" const variable
    if (flairCh !== undefined) {
      const messages = await flairCh.messages.fetch({ after: '0', limit: 5 });
      const messagesArray = Array.from(messages.values());
      let flairMess = messagesArray[messagesArray.length - 1]; // Get first message (oldest)
      
      if (flairMess === undefined) {
        console.error('ERROR: Flair Message not found!');
        // If message doesn't exist create it
        flairMess = await flairCh.send('React to this message to get your flair! You will be able to change it at any time and it will allow you to get pinged for news and events for the topics you like!');
      } else {
        await flairMess.edit('React to this message to get your flair! You will be able to change it at any time and it will allow you to get pinged for news and events for the topics you like!');
      }

      for (const flair of Flairs) {
        const ico = this.guild.emojis.cache.find(emoji => emoji.name === flair.ico) as GuildEmoji | undefined;
        try {
          await flairMess.react(ico !== undefined ? ico : flair.ico);
        } catch (error) {
          console.error(error);
        }
      }

      this.client.on('messageReactionAdd', (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        if (react.message.id !== flairMess.id || !this.guild) return;
        for (const flair of Flairs) {
          if (react.emoji.name === flair.ico) {
            const gUser = this.guild.members.cache.find(u => u.id === user.id);
            const role = this.guild.roles.cache.find(r => r.name === flair.name);
            if (gUser && role) {
              gUser.roles.add([role.id]);
            }
          }
        }
      });

      this.client.on('messageReactionRemove', (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        if (react.message.id !== flairMess.id || !this.guild) return;
        for (const flair of Flairs) {
          if (react.emoji.name === flair.ico) {
            const gUser = this.guild.members.cache.find(u => u.id === user.id);
            const role = this.guild.roles.cache.find(r => r.name === flair.name);
            if (gUser && role) {
              gUser.roles.remove([role.id]);
            }
          }
        }
      });
    }

    console.log('✅ Initialized Flair Check.');
  }
}

export default FlairCheck;
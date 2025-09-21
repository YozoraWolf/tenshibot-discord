import dotenv from 'dotenv';
dotenv.config();

import { Client, Guild, TextChannel, MessageReaction, PartialMessageReaction, User, PartialUser, Message } from 'discord.js';
import { StringsData } from '../types/index';

const Strings: StringsData = require('../data/strings.json');

class Over18Check {
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
    let overMess: Message | undefined = undefined;
    
    if (flairCh !== undefined) {
      // Get the second sent message on the channel flairCh
      const messages = await flairCh.messages.fetch({ after: '0', limit: 5 });
      const messagesArray = Array.from(messages.values());
      overMess = messagesArray[messagesArray.length - 2]; // Get second message
      
      if (overMess === undefined) {
        console.error('ERROR: Over 18 Message not found! Creating...');
        // If message doesn't exist create it
        overMess = await flairCh.send(Strings.nsfw);
      } else {
        await overMess.edit(Strings.nsfw);
      }
    }

    const nsfw = this.guild.roles.cache.find(r => r.name === 'NSFW');
    if (nsfw === undefined) {
      this.createNSFWRole();
    } else {
      this.updateNSFWDisclaimer(overMess);
    }

    if (overMess) {
      await overMess.react('🔞');
      
      this.client.on('messageReactionAdd', (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        if (react.message.id !== overMess!.id || !this.guild) return;
        const gUser = this.guild.members.cache.find(u => u.id === user.id);
        if (react.emoji.name === '🔞') {
          const nsfwRole = this.guild.roles.cache.find(r => r.name === 'NSFW');
          if (gUser && nsfwRole) {
            gUser.roles.add([nsfwRole.id]);
          }
        }
      });

      this.client.on('messageReactionRemove', (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        if (react.message.id !== overMess!.id || !this.guild) return;
        const gUser = this.guild.members.cache.find(u => u.id === user.id);
        if (react.emoji.name === '🔞') {
          const nsfwRole = this.guild.roles.cache.find(r => r.name === 'NSFW');
          if (gUser && nsfwRole) {
            gUser.roles.remove([nsfwRole.id]);
          }
        }
      });
    }

    console.log('✅ Initialized Over 18 Check.');
  }

  static async createNSFWRole(): Promise<void> {
    if (!this.guild) return;
    
    await this.guild.roles.create({
      name: 'NSFW',
      color: 0x780000,
      reason: 'NSFW'
    });
  }

  static async updateNSFWDisclaimer(overMess: Message | undefined): Promise<void> {
    if (overMess === undefined || !this.guild) {
      console.error('ERROR: NSFW Message not found!');
      return;
    }
    
    overMess.edit(Strings.nsfw);

    this.client?.on('messageReactionAdd', async (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
      if (react.message.id !== overMess.id || !this.guild) return;
      const gUser = await this.guild.members.fetch(user.id!);
      if (react.emoji.name === '🔞') {
        try {
          console.log('Added role to ' + gUser.user.username);
          const nsfwRole = this.guild.roles.cache.find(r => r.name === 'NSFW');
          if (nsfwRole) {
            gUser.roles.add(nsfwRole.id);
          }
        } catch (e) {
          console.error('Could not change role!\nE: ', e);
        }
      }
    });

    this.client?.on('messageReactionRemove', async (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
      if (react.message.id !== overMess.id || !this.guild) return;
      const gUser = await this.guild.members.fetch(user.id!);
      if (react.emoji.name === '🔞') {
        try {
          console.log('Removed role from ' + gUser.user.username);
          const nsfwRole = this.guild.roles.cache.find(r => r.name === 'NSFW');
          if (nsfwRole) {
            gUser.roles.remove(nsfwRole.id);
          }
        } catch (e) {
          console.error('Could not change role!\nE: ', e);
        }
      }
    });
  }
}

export default Over18Check;
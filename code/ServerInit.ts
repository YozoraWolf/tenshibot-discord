import dotenv from 'dotenv';
dotenv.config();

import { Client, Guild, GuildMember, Role, TextChannel, MessageReaction, PartialMessageReaction, User, PartialUser, PermissionFlagsBits } from 'discord.js';
import { StringsData } from '../types/index';

const Strings: StringsData = require('../data/strings.json');

class ServerInit {
  private static client: Client | undefined = undefined;
  private static guild: Guild | undefined = undefined;

  static async init(client: Client): Promise<void> {
    this.client = client;
    if (process.env.SWM_ID) {
      this.guild = await this.client.guilds.fetch(process.env.SWM_ID);
    }
    
    await this.checkInitChannel();

    this.client.on('guildMemberAdd', async (member: GuildMember) => {
      const { guild } = member;
      const role = guild.roles.cache.find((role) => role.name === 'New');

      if (role) {
        try {
          await member.roles.add(role);
          console.log(`Assigned ${role.name} role to ${member.user.tag}`);
        } catch (error) {
          console.error(error);
        }
      }
    });

    console.log('✅ Initialized Server Init.');
  }

  static async checkInitChannel(): Promise<void> {
    if (!this.guild) return;
    
    const init = this.guild.channels.cache.find(c => c.name === 'init') as TextChannel | undefined;
    
    if (init === undefined) {
      const newRole = await this.guild.roles.create({
        name: 'New',
        color: 0xFFFFFF,
        reason: 'New'
      });

      this.createInitChannel(newRole);
    } else {
      this.updateRulesMessage();
    }
  }

  static async createInitChannel(newRole: Role): Promise<void> {
    if (!this.guild || !process.env.SWM_CAT_ID) return;
    
    console.log('Init channel does not exist, creating...');
    const channel = await this.guild.channels.create({
      name: 'init',
      parent: process.env.SWM_CAT_ID,
      permissionOverwrites: [
        {
          id: newRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
        }
      ]
    });

    const mess = await channel.send(Strings.rules + '\n\nIf you agree to the rules, please click on the check mark.');
    await mess.react('✅');
    await mess.react('❎');
    
    this.client?.on('messageReactionAdd', (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
      if (react.message.id !== mess.id || !this.guild) return;
      const gUser = this.guild.members.cache.find(u => u.id === user.id);
      if (react.emoji.name === '✅') {
        const guestRole = this.guild.roles.cache.find(r => r.name === 'Guest');
        if (gUser && guestRole) {
          gUser.roles.set([guestRole.id]);
        }
      } else if (react.emoji.name === '❎') {
        gUser?.kick('Member disagreed to rules.');
      }
    });
  }

  static async updateRulesMessage(): Promise<void> {
    if (!this.guild) return;
    
    const initChannel = this.guild.channels.cache.find(ch => ch.name === 'init') as TextChannel | undefined;
    if (!initChannel) return;
    
    const messages = await initChannel.messages.fetch({ limit: 1 });
    const agreeMess = messages.first();
    
    if (agreeMess) {
      agreeMess.edit(Strings.rules + '\n\nIf you agree to the rules, please click on the check mark.');

      this.client?.on('messageReactionAdd', (react: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        if (react.message.id !== agreeMess.id || !this.guild) return;
        const gUser = this.guild.members.cache.find(u => u.id === user.id);
        if (react.emoji.name === '✅') {
          const guestRole = this.guild.roles.cache.find(r => r.name === 'Guest');
          if (gUser && guestRole) {
            gUser.roles.set([guestRole.id]);
          }
        } else if (react.emoji.name === '❎') {
          gUser?.kick('Member disagreed to rules.');
        }
      });
    }
  }
}

export default ServerInit;
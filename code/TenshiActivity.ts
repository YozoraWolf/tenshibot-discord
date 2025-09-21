import dotenv from 'dotenv';
dotenv.config();

import Utils from './Utils';
import { Client, Guild } from 'discord.js';
import { StatusData } from '../types/index';

const TENSHI_STATUS: StatusData[] = require('../tenshi_status.json');

class TenshiActivity {
  private static client: Client | undefined = undefined;
  private static guild: Promise<Guild> | undefined = undefined;
  private static changeTime: number = 300000;

  static init(client: Client): void {
    this.client = client;
    if (process.env.SWM_ID) {
      this.guild = this.client.guilds.fetch(process.env.SWM_ID);
    }

    this.setRandomActivity();
    setInterval(() => this.setRandomActivity(), TenshiActivity.changeTime);

    console.log('✅ Initialized Tenshi Activity.');
  }

  static setRandomActivity(): void {
    if (!this.client?.user) return;
    
    const r = Utils.getRandom(0, TENSHI_STATUS.length - 1);
    this.client.user.setActivity(TENSHI_STATUS[r].msg, { type: TENSHI_STATUS[r].type });
  }
}

export default TenshiActivity;
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
dotenv.config();

import Utils from './Utils.js';
import { Client, Guild } from 'discord.js';
import { StatusData } from '../types/index.js';
import fs from 'fs';
import path from 'path';

// Load tenshi_status.json with proper path resolution
const statusPath = path.resolve(process.cwd(), 'tenshi_status.json');
const TENSHI_STATUS: StatusData[] = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));

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
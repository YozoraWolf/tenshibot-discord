import dotenv from 'dotenv';
dotenv.config();

export default class FunFuncs {

    client = undefined;
    guild = undefined;

    static async init(client) {
        this.client = client;
        this.guild = await this.client.guilds.fetch(process.env.SWM_ID);
        console.log("Initialized Fun Functions.");
    }
}
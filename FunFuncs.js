import BOT_VARS from "./BOT_VARS";

export default class FunFuncs {

    client = undefined;
    guild = undefined;

    static async init(client) {
        this.client = client;
        this.guild = await this.client.guilds.fetch(BOT_VARS.swm_id);
        console.log("Initialized Fun Functions.");
    }
}
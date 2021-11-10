import SWM_ML from "./swm_members.json";
import fs from "fs";
import BOT_VARS from "./BOT_VARS.js";

export default class MemberStatus {

    client = undefined;

    static init(client) {
        this.client = client;
        console.log("Member Status started!");
        this.listMembers();
    }
    static async listMembers() {
        let SWM = await this.client.guilds.fetch(BOT_VARS.swm_id);
        SWM.members.fetch( { user: SWM_ML.map((m) => { return [m.id] }) } ).then((members) => {
            //console.log("Members: ", members);
        });
    }
}

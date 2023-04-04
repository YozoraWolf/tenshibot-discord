const dotenv = require("dotenv");
dotenv.config();
const SWM_ML = require("./swm_members.json");

module.exports = class MemberStatus {
    static client = undefined;
    
    static init(client) {
        this.client = client;
        console.log("Member Status started!");
        this.listMembers();
    }
    
    static async listMembers() {
        let SWM = await this.client.guilds.fetch(process.env.SWM_ID);
        SWM.members.fetch( { user: SWM_ML.map((m) => { return [m.id] }) } ).then((members) => {
            //console.log("Members: ", members);
        });
    }
};
const dotenv = require('dotenv');
dotenv.config();
const Utils = require("./Utils.js");
const TENSHI_STATUS = require("./tenshi_status.json");

class TenshiActivity {

    client = undefined;
    guild = undefined;

    static changeTime = 300000;

    static init(client) {
        this.client = client;
        this.guild = this.client.guilds.fetch(process.env.SWM_ID);

        this.setRandomActivity();
        setInterval(() => this.setRandomActivity(), TenshiActivity.changeTime);

        console.log("Initialized Tenshi Activity.")
    }

    static setRandomActivity() {
        let r = Utils.getRandom(0, TENSHI_STATUS.length-1);
        //console.log("New: ", TENSHI_STATUS[r].type + " " + TENSHI_STATUS[r].msg);
        this.client.user.setActivity(TENSHI_STATUS[r].msg, {type: TENSHI_STATUS[r].type});
    }
}

module.exports = TenshiActivity;
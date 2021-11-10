import dotenv from "dotenv";
dotenv.config();

import { Client, MessageAttachment } from "discord.js";
import MemberStatus from "./MemberStatus.js";
import ServerInit from "./ServerInit.js";
import TenshiInteract from "./TenshiInteract.js";
import TenshiActivity from "./TenshiActivity.js";

let client = new Client();

client.on("ready", () => {
    console.log(`Connected as ${client.user.username}`);
    MemberStatus.init(client);
    ServerInit.init(client);
    TenshiInteract.init(client);
    TenshiActivity.init(client);
});

client.on('disconnect', function () {
    // Relog again here
    console.log("Connection closed! Reconnecting...");
    client.login(process.env.BOT_TOKEN);
});

client.on('error', (err) => {
    //setTimeout(this.reconnect, reconnection_time);
});

client.login(process.env.BOT_TOKEN);
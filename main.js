import { Client, MessageAttachment } from "discord.js";
import Tenshi from "./tenshi.js";
import MemberStatus from "./MemberStatus.js";
import ServerInit from "./ServerInit.js";
import TenshiInteract from "./TenshiInteract.js";

let client = new Client();

client.on("ready", () => {
    var _a;
    console.log(`Connected as ${client.user.username}`);
    MemberStatus.init(client);
    ServerInit.init(client);
    TenshiInteract.init(client);
});

client.on('disconnect', function () {
    // Relog again here
    console.log("Connection closed! Reconnecting...");
    client.login('MjcxMTY4NjUyNjU5Nzg1NzI4.DsJybA.hKgY8lCF0L3tj2gE3ItUKPUhtkA');
});

client.on('error', (err) => {
    //setTimeout(this.reconnect, reconnection_time);
});

client.login('MjcxMTY4NjUyNjU5Nzg1NzI4.DsJybA.hKgY8lCF0L3tj2gE3ItUKPUhtkA');
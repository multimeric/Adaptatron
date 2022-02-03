// Script for local bot development
import {GatewayServer, SlashCreator} from "slash-create";
import * as Discord from "discord.js";
import * as path from "path";
import {env} from "./common";

const client = new Discord.Client({ intents: [ ] });
const creator = new SlashCreator({ client, ...env });
if (!process.env.GUILD_ID){
    throw new Error("Please set the GUILD_ID variable to the ID of a server you are testing the bot in")
}

setTimeout(async () => {
    await creator
        .withServer(
            new GatewayServer(
                (handler) => client.ws.on('INTERACTION_CREATE', handler)
            )
        )
        .registerCommandsIn(path.join(__dirname, 'commands'))
        .syncCommandsIn(process.env.GUILD_ID!, true);

    await client.login(env.token);
});
import {AWSLambdaServer, SlashCreator, GatewayServer} from "slash-create";
import Discord from "discord.js";
// import * as fs from "fs/promises";
import * as path from "path";

let creator;

if (process.env.ENVIRONMENT === "DEBUG") {
    const client = new Discord.Client({
        intents: [
            "DIRECT_MESSAGES",
            "GUILD_MESSAGES"
        ],
    });
    creator = new SlashCreator({
        applicationID: process.env.DISCORD_APP_ID!,
        publicKey: process.env.DISCORD_PUBLIC_KEY,
        token: process.env.DISCORD_BOT_TOKEN,
        client,

    })
        .withServer(new GatewayServer(
            (handler) => client.ws.on('INTERACTION_CREATE', handler)
        ))
        .registerCommandsIn(path.resolve('../commands_layer/nodejs/commands'))
        .syncCommands({
            syncGuilds: true,
        });
    client.login(process.env.DISCORD_BOT_TOKEN);
} else {
    creator = new SlashCreator({
        applicationID: process.env.DISCORD_APP_ID!,
        publicKey: process.env.DISCORD_PUBLIC_KEY,
    })
        .withServer(new AWSLambdaServer(module.exports, 'lambdaHandler'))
        .registerCommandsIn('/opt/nodejs/commands');
}

creator.on('debug', console.log);
creator.on('warn', console.log);
creator.on('error', console.log);
creator.on('rawREST', (request) => {
    console.log("Request:", JSON.stringify(request.body));
});

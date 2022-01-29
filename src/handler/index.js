"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
const discord_js_1 = __importDefault(require("discord.js"));
// import * as fs from "fs/promises";
const path = __importStar(require("path"));
let creator;
if (process.env.ENVIRONMENT === "DEBUG") {
    const client = new discord_js_1.default.Client({
        intents: [
            "DIRECT_MESSAGES",
            "GUILD_MESSAGES"
        ],
    });
    creator = new slash_create_1.SlashCreator({
        applicationID: process.env.DISCORD_APP_ID,
        publicKey: process.env.DISCORD_PUBLIC_KEY,
        token: process.env.DISCORD_BOT_TOKEN,
        client,
    })
        .withServer(new slash_create_1.GatewayServer((handler) => client.ws.on('INTERACTION_CREATE', handler)))
        .registerCommandsIn(path.resolve('../commands_layer/nodejs/commands'))
        .syncCommands({
        syncGuilds: true,
    });
    client.login(process.env.DISCORD_BOT_TOKEN);
}
else {
    creator = new slash_create_1.SlashCreator({
        applicationID: process.env.DISCORD_APP_ID,
        publicKey: process.env.DISCORD_PUBLIC_KEY,
    })
        .withServer(new slash_create_1.AWSLambdaServer(module.exports, 'lambdaHandler'))
        .registerCommandsIn('/opt/nodejs/commands');
}
creator.on('debug', console.log);
creator.on('warn', console.log);
creator.on('error', console.log);
creator.on('rawREST', (request) => {
    console.log("Request:", JSON.stringify(request.body));
});

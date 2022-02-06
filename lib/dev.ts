// Script for local bot development
import { GatewayServer, SlashCreator } from "slash-create";
import * as Discord from "discord.js";
import { getSlashEnv, commands } from "./common";

let env = getSlashEnv();

const client = new Discord.Client({ intents: [] });
const creator = new SlashCreator({ client, ...env, unknownCommandResponse: false });
if (!process.env.DISCORD_GUILD_ID) {
  throw new Error(
    "Please set the DISCORD_GUILD_ID variable to the ID of a server you are testing the bot in"
  );
}

setTimeout(async () => {
  await creator
    .withServer(
      new GatewayServer((handler) =>
        client.ws.on("INTERACTION_CREATE", handler)
      )
    )
    .registerCommands(commands)

  await client.login(env.token);
}, 0);

import { AWSLambdaServer, SlashCreator } from "slash-create";
import { getSlashEnv, commands } from "./common";

const creator = new SlashCreator(getSlashEnv());

// This defines the lambda.interactions endpoint
creator
  .withServer(new AWSLambdaServer(module.exports, "interactions"))
  .registerCommands(commands);

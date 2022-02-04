import Hello from "./commands/hello";
import LambdaSlashCommand from "./command";

const requiredVars = [
  "DISCORD_APP_ID",
  "DISCORD_BOT_TOKEN",
  "DISCORD_PUBLIC_KEY",
];
const envKeys = new Set(Object.keys(process.env));

interface SlashEnv {
  applicationID: string;
  publicKey: string;
  token: string;
}

/**
 * Returns a dictionary of env vars to pass into the SlashCreator
 */
export function getSlashEnv(): SlashEnv {
  if (!requiredVars.every((item) => envKeys.has(item))) {
    throw new Error(
      `You must export all of the following variables: ${requiredVars.join(
        ", "
      )}`
    );
  }
  return {
    applicationID: process.env.DISCORD_APP_ID!,
    publicKey: process.env.DISCORD_PUBLIC_KEY!,
    token: process.env.DISCORD_BOT_TOKEN!,
  };
}

/**
 * Returns a dictionary of env vars for use in CDK
 */
export function getCdkEnv(): Record<string, string> {
  if (!requiredVars.every((item) => envKeys.has(item))) {
    throw new Error(
      `You must export all of the following variables: ${requiredVars.join(
        ", "
      )}`
    );
  }
  // @ts-ignore
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, val]) => !!val && requiredVars.includes(key)
    )
  );
}

export const commands: typeof LambdaSlashCommand[] = [
  Hello,
  /*
  Put your commands here
  */
];

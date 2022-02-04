import LambdaSlashCommand from "./command";
interface SlashEnv {
  applicationID: string;
  publicKey: string;
  token: string;
}
/**
 * Returns a dictionary of env vars to pass into the SlashCreator
 */
export declare function getSlashEnv(): SlashEnv;
/**
 * Returns a dictionary of env vars for use in CDK
 */
export declare function getCdkEnv(): Record<string, string>;
export declare const commands: typeof LambdaSlashCommand[];
export {};

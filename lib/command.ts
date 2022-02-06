import {ApplicationCommand, SlashCommand, SlashCommandOptions, SlashCreator} from "slash-create";

export default abstract class LambdaSlashCommand extends SlashCommand {
  protected constructor(creator: SlashCreator, opts: SlashCommandOptions) {
    // Patch in the guild ID if we have one
    if (process.env.DISCORD_GUILD_ID) {
      opts.guildIDs = [process.env.DISCORD_GUILD_ID];
    }
    super(creator, opts);
  }
}

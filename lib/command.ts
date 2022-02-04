import {SlashCommand, SlashCommandOptions, SlashCreator} from "slash-create";

export default class LambdaSlashCommand extends SlashCommand {
    constructor(creator: SlashCreator, opts: SlashCommandOptions) {
        // Patch in the guild ID if we have one
        if (process.env.DISCORD_GUILD_ID) {
            opts.guildIDs = [process.env.DISCORD_GUILD_ID];
        }
        super(creator, opts);
    }
}

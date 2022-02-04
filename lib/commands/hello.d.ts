import { CommandContext, SlashCreator } from "slash-create";
import LambdaSlashCommand from "../command";
export default class HelloCommand extends LambdaSlashCommand {
    constructor(creator: SlashCreator);
    run(ctx: CommandContext): Promise<string>;
}

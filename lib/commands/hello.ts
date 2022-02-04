import {CommandContext, CommandOptionType, SlashCreator} from "slash-create";
import LambdaSlashCommand from "../command";

export default class HelloCommand extends LambdaSlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
            name: 'hello',
            description: 'Says hello to you.',
            options: [{
                type: CommandOptionType.STRING,
                name: 'food',
                description: 'What food do you like?'
            }]
        });

        this.filePath = __filename;
    }

    async run(ctx: CommandContext) {
        return ctx.options.food ? `You like ${ctx.options.food}? Nice!` : `Hello, ${ctx.user.username}!`;
    }
}

import {CommandContext, SlashCreator} from "slash-create";
import LambdaSlashCommand from "../command";
import {Card} from "../models"
import {DynamoStore} from '@shiftcoders/dynamo-easy'

export default class CardCommand extends LambdaSlashCommand {
    constructor(creator: SlashCreator) {
        // The real command is defined in Setup, this is just a placeholder to make slash-create happy
        super(creator, {
            name: "lorcard",
            description: "fake description",
            guildIDs: process.env.DISCORD_GUILD_ID ? [process.env.DISCORD_GUILD_ID] : []
        });

        this.filePath = __filename;
    }


    async run(ctx: CommandContext) {
        let query = new DynamoStore(Card).scan();
        await ctx.defer();

        for (let [key, value] of Object.entries(ctx.options)) {
            switch (key) {
                case "name_contains":
                    query = query.whereAttribute("name").contains(value);
                    break;
                case "description_contains":
                    query = query.whereAttribute("description").contains(value);
                    break;
            }
        }
        try {
            const result = await query.execFetchAll();
            if (result) {
                await ctx.sendFollowUp({
                        embeds: [
                            {
                                image: {
                                    url: result[0].assets[0].gameAbsolutePath
                                }
                            }
                        ]
                    }
                )
                return
            } else {
                return "Card not found"
            }
        }
        catch (e) {
            console.error(e);
            return;
        }
    }
}
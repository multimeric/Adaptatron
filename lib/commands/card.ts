import {CommandContext, SlashCreator} from "slash-create";
import LambdaSlashCommand from "../command";
import {Card} from "../models"
import {DynamoStore} from '@shiftcoders/dynamo-easy'
import {CardFilter} from "../cardFilter";

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
                case CardFilter.NameContains:
                    query = query.whereAttribute("name").contains(value);
                    break;
                case CardFilter.DescriptionContains:
                    query = query.whereAttribute("description").contains(value);
                    break;
                case CardFilter.LevelUpContains:
                    query = query.whereAttribute("levelupDescriptionRaw").contains(value);
                    break;
                case CardFilter.AttackEquals:
                    query = query.whereAttribute("attack").eq(value);
                    break;
                case CardFilter.AttackGreater:
                    query = query.whereAttribute("attack").gt(value);
                    break;
                case CardFilter.AttackLess:
                    query = query.whereAttribute("attack").lt(value);
                    break;
                case CardFilter.HealthEquals:
                    query = query.whereAttribute("health").eq(value);
                    break;
                case CardFilter.HealthGreater:
                    query = query.whereAttribute("health").gt(value);
                    break;
                case CardFilter.HealthLess:
                    query = query.whereAttribute("health").lt(value);
                    break;
                case CardFilter.CostEquals:
                    query = query.whereAttribute("cost").eq(value);
                    break;
                case CardFilter.CostGreater:
                    query = query.whereAttribute("cost").gt(value);
                    break;
                case CardFilter.CostLess:
                    query = query.whereAttribute("cost").lt(value);
                    break;
                case CardFilter.HasKeyword:
                    query = query.whereAttribute("keywordRefs").contains(value);
                    break;
                case CardFilter.HasSupertype:
                    query = query.whereAttribute("supertype").eq(value)
                    break;
                case CardFilter.FromSet:
                    query = query.whereAttribute("set").eq(value)
                    break;
                case CardFilter.SpellSpeed:
                    query = query.whereAttribute("spellSpeedRef").eq(value)
                    break;
                case CardFilter.HasType:
                    query = query.whereAttribute("type").eq(value)
                    break;
                case CardFilter.HasSubtype:
                    query = query.whereAttribute("subtypes").contains(value)
                    break;
                case CardFilter.FromRegion:
                    query = query.whereAttribute("regionRefs").contains(value)
                    break;
                case CardFilter.HasRarity:
                    query = query.whereAttribute("rarityRef").eq(value)
                    break;
            }
        }
        try {
            const result = await query.execFetchAll();
            if (result.length > 0) {
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
        } catch (e) {
            console.error(e);
            return;
        }
    }
}
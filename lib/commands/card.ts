import {CommandContext, SlashCreator} from "slash-create";
import LambdaSlashCommand from "../command";
import {Card} from "../models"
import {CardFilter} from "../cardFilter";
import {FilterExpressions} from "dynamodb-toolbox/dist/lib/expressionBuilder";

export default class CardCommand extends LambdaSlashCommand {
    constructor(creator: SlashCreator) {
        // The real command is defined in Setup, this is just a placeholder to make slash-create happy
        super(creator, {
            name: "lorcard",
            description: "fake description",
            guildIDs: process.env.DISCORD_GUILD_ID ? [process.env.DISCORD_GUILD_ID] : undefined
        });

        this.filePath = __filename;
    }

    _makeContainsFilter(field: string, value: string): any[] {
        return value.split(" ").map(word => ({
            attr: field,
            contains: word
        }));
    }

    async run(ctx: CommandContext) {
        // await ctx.defer();
        const filters: FilterExpressions = [];
        for (let [key, value] of Object.entries(ctx.options)) {
            switch (key) {
                case CardFilter.NameContains:
                    filters.splice(0, 0, ...this._makeContainsFilter("name", value));
                    break;
                case CardFilter.DescriptionContains:
                    filters.splice(0, 0, ...this._makeContainsFilter("description", value));
                    break;
                case CardFilter.LevelUpContains:
                    filters.splice(0, 0, ...this._makeContainsFilter("levelupDescriptionRaw", value));
                    break;
                case CardFilter.AttackEquals:
                    filters.push({attr: "attack", eq: value});
                    break;
                case CardFilter.AttackGreater:
                    filters.push({attr: "attack", gt: value});
                    break;
                case CardFilter.AttackLess:
                    filters.push({attr: "attack", lt: value});
                    break;
                case CardFilter.HealthEquals:
                    filters.push({attr: "health", eq: value});
                    break;
                case CardFilter.HealthGreater:
                    filters.push({attr: "health", gt: value});
                    break;
                case CardFilter.HealthLess:
                    filters.push({attr: "health", lt: value});
                    break;
                case CardFilter.CostEquals:
                    filters.push({attr: "cost", eq: value});
                    break;
                case CardFilter.CostGreater:
                    filters.push({attr: "cost", gt: value});
                    break;
                case CardFilter.CostLess:
                    filters.push({attr: "cost", lt: value});
                    break;
                case CardFilter.HasKeyword:
                    filters.push({attr: "keywordRefs", contains: value});
                    break;
                case CardFilter.HasSupertype:
                    filters.push({attr: "supertype", eq: value})
                    break;
                case CardFilter.FromSet:
                    filters.push({attr: "set", eq: value})
                    break;
                case CardFilter.SpellSpeed:
                    filters.push({attr: "spellSpeedRef", eq: value})
                    break;
                case CardFilter.HasType:
                    filters.push({attr: "type", eq: value})
                    break;
                case CardFilter.HasSubtype:
                    filters.push({attr: "subtypes", contains: value})
                    break;
                case CardFilter.FromRegion:
                    filters.push({attr: "regionRefs", contains: value})
                    break;
                case CardFilter.HasRarity:
                    filters.push({attr: "rarityRef", eq: value})
                    break;
            }
        }
        try {
            const results = await Card.scan({
                attributes: ["assets"],
                filters
            });
            if (results.Items.length > 0) {
                await ctx.sendFollowUp({
                        embeds: [
                            {
                                image: {
                                    url: results.Items[0].assets[0].gameAbsolutePath
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
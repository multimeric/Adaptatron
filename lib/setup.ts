import {commands, getSlashEnv} from "./common";
import * as rune from "lor-data-dragon";

import {DynamoDBDocument} from "@aws-sdk/lib-dynamodb";
import {DynamoDB} from "@aws-sdk/client-dynamodb";
import {CardFilter} from "./cardFilter"
import {zip} from "iter-tools"
import {Card} from "./models"
import {CommandOptionType, SlashCreator, ApplicationCommandOptionChoice} from "slash-create";

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function pushCardBatch(ddbDocClient: DynamoDBDocument, batch: any[]) {
    if (!process.env.AWS_TABLE_NAME) {
        throw new Error("AWS_TABLE_NAME must be specified");
    }
    // Loop until it succeeds
    while (true) {
        try {
            await Card.table.batchWrite(batch.map(it => Card.putBatch(it)));
            console.log("25 cards successfully loaded.")
            break;
        } catch (e: any) {
            if (e.name == "ProvisionedThroughputExceededException") {
                console.warn("Throughput exceeded. Waiting for 5 seconds.")
                // Wait for 1 minute
                await delay(1000 * 10)
            } else {
                throw e;
            }
        }
    }
}

async function iterateCards(dragon: rune.DataDragon): Promise<Choices> {
    const ret: Choices = {
        keywords: new Map(),
        regions: new Map(),
        sets: new Map(),
        speeds: new Map(),
        rarities: new Map(),
        subtypes: new Map(),
        supertypes: new Map(),
        types: new Map(),
    };
    const cards = [];
    const client = new DynamoDB({});
    const ddbDocClient = DynamoDBDocument.from(client)

    for (const set of Object.values(rune.Set)) {
        if (!(typeof set === "number")) {
            continue;
        }
        const bundle = await dragon.getLiteSetBundle(set as rune.Set, rune.Locale.English)
        for (const card of await bundle.getCards()) {
            // Update lists of options
            if (card.spellSpeed) {
                ret.speeds.set(card.spellSpeed, {name: card.spellSpeed, value: card.spellSpeed});
            }
            if (card.rarity) {
                // For some reason the rarityRef is human readable here
                ret.rarities.set(card.rarityRef, {name: card.rarityRef, value: card.rarityRef});
            }
            if (card.type) {
                ret.types.set(card.type, {name: card.type, value: card.type});
            }
            if (card.supertype) {
                ret.supertypes.set(card.supertype, {name: card.supertype, value: card.supertype});
            }
            if (card.set) {
                const setNumber = parseInt(card.set.slice(-1));
                ret.sets.set(setNumber, {name: rune.Set[setNumber], value: setNumber});
            }

            for (const [keyword, ref] of zip(card.keywords, card.keywordRefs)) {
                ret.keywords.set(ref, {
                    name: keyword,
                    value: ref
                })
            }
            for (const [region, ref] of zip(card.regions, card.regionRefs)) {
                ret.regions.set(ref, {
                    name: region,
                    value: ref
                })
            }
            for (const subtype of card.subtypes) {
                ret.keywords.set(subtype, {
                    name: subtype.toLowerCase(),
                    value: subtype
                })
            }

            cards.push(card);

            if (cards.length == 25) {
                await pushCardBatch(ddbDocClient, cards);
                cards.splice(0, 25);
            }
        }
    }

    // Add remaining cards
    await pushCardBatch(ddbDocClient, cards);

    return ret;
}

interface Choices {
    keywords: Map<string, ApplicationCommandOptionChoice>,
    regions: Map<string, ApplicationCommandOptionChoice>,
    subtypes: Map<string, ApplicationCommandOptionChoice>,
    supertypes: Map<string, ApplicationCommandOptionChoice>,
    types: Map<string, ApplicationCommandOptionChoice>,
    rarities: Map<string, ApplicationCommandOptionChoice>,
    speeds: Map<string, ApplicationCommandOptionChoice>,
    sets: Map<number, ApplicationCommandOptionChoice>
}

async function registerCommands(choices: Choices) {
    const creator = new SlashCreator(getSlashEnv());
    // Abuse the slash creator API and directly push a command
    await creator.api.updateCommands([
            {
                name: "lorcard",
                description: "Retrieves a Legends of Runeterra card matching a set of criteria",
                options: [
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.NameContains,
                        description: "One or more words that can be found within the card name",
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.DescriptionContains,
                        description: "One or more words that can be found within the card's description",
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.LevelUpContains,
                        description: "One or more words that can be found within the champion's level up text",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.AttackEquals,
                        description: "The unit's attack is equal to",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.AttackGreater,
                        description: "The unit's attack is greater than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.AttackLess,
                        description: "The unit's attack is less than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.HealthEquals,
                        description: "The unit's health is equal to",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.HealthGreater,
                        description: "The unit's health is greater than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.HealthLess,
                        description: "The unit's health is less than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.CostEquals,
                        description: "The unit's cost is equal to",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.CostGreater,
                        description: "The unit's cost is greater than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.CostLess,
                        description: "The unit's cost is less than",
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.HasKeyword,
                        description: "The unit has the keyword",
                        // choices: Array.from(choices.keywords)
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.HasSupertype,
                        description: "The unit has the supertype",
                        choices: Array.from(choices.supertypes.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.HasType,
                        description: "The unit has the type",
                        choices: Array.from(choices.types.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.HasSubtype,
                        description: "The unit has the subtype",
                        choices: Array.from(choices.subtypes.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.FromRegion,
                        description: "The card comes from the region",
                        choices: Array.from(choices.regions.values())
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: CardFilter.FromSet,
                        description: "The card comes from the set",
                        choices: Array.from(choices.sets.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.SpellSpeed,
                        description: "The spell has the speed",
                        choices: Array.from(choices.speeds.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: CardFilter.HasRarity,
                        description: "The card has the rarity",
                        choices: Array.from(choices.rarities.values())
                    },
                ],
            }
        ],
        // If we are debugging in a guild, update it here
        process.env.DISCORD_GUILD_ID
    )
}

export async function handler() {
    const dragon = new rune.DataDragon({});
    const choices = await iterateCards(dragon);
    await registerCommands(choices);
    return "Setup completed";
}

if (require.main === module) {
    handler();
}
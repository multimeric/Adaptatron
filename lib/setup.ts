import {getSlashEnv} from "./common";
import * as rune from "lor-data-dragon";

import {FilterType, Command} from "./types"
import {batch, concat, zip} from "iter-tools"
import {Card, Term} from "./models"
import {ApplicationCommandOptionChoice, CommandOptionType, SlashCreator} from "slash-create";

/**
 * Awaitable function that delays for a period of time
 * @param ms Number of milliseconds to wait
 */
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pushes a batch of up to 25 cards to the database
 */
async function pushCardBatch(batch: any[]) {
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

/**
 * Main function that iterates every single card and updates the interaction choices, and also puts the cards into the
 * db
 */
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

    for (const set of Object.values(rune.Set)) {
        if (!(typeof set === "number")) {
            continue;
        }
        const bundle = await dragon.getLiteSetBundle(set as rune.Set, rune.Locale.English)
        for (const card of await bundle.getCards()) {
            // Update lists of options
            if (card.spellSpeed) {
                ret.speeds.set(card.spellSpeed, {name: card.spellSpeed, value: card.spellSpeed.toLowerCase()});
            }
            if (card.rarity) {
                // For some reason the rarityRef is human-readable here
                ret.rarities.set(card.rarityRef, {name: card.rarityRef, value: card.rarityRef.toLowerCase()});
            }
            if (card.type) {
                ret.types.set(card.type, {name: card.type, value: card.type.toLowerCase()});
            }
            if (card.supertype) {
                ret.supertypes.set(card.supertype, {name: card.supertype, value: card.supertype.toLowerCase()});
            }
            if (card.set) {
                const setNumber = parseInt(card.set.slice(-1));
                ret.sets.set(setNumber, {name: rune.Set[setNumber], value: card.set});
            }

            for (const [keyword, ref] of zip(card.keywords, card.keywordRefs)) {
                ret.keywords.set(ref, {
                    name: keyword,
                    value: ref.toLowerCase()
                })
            }
            for (const [region, ref] of zip(card.regions, card.regionRefs)) {
                ret.regions.set(ref, {
                    name: region,
                    value: ref.toLowerCase()
                })
            }
            for (const subtype of card.subtypes) {
                ret.keywords.set(subtype, {
                    name: subtype.toLowerCase(),
                    value: subtype.toLowerCase()
                })
            }

            cards.push(card);

            if (cards.length == 25) {
                await pushCardBatch(cards);
                cards.splice(0, 25);
            }
        }
    }

    // Add remaining cards
    await pushCardBatch(cards);

    return ret;
}

/**
 * Used to keep track of interaction choices (enums). Maps are used to avoid duplicates.
 */
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
    // Abuse the slash creator API and directly push a command, because there is no async way to register a command
    // using slash-create. See: https://github.com/Snazzah/slash-create/issues/239
    await creator.api.updateCommands([
            {
                name: "lordefine",
                description: "Defines a keyword or other vocabulary term from Legends of Runeterra",
                options: [
                    {
                        name: "term"  ,
                        type: CommandOptionType.STRING,
                        description: 'The vocabulary term, e.g. "Deep", or "Reforge"'
                    }
                ]
            },
            {
                name: "lorcard",
                description: "Retrieves a Legends of Runeterra card matching a set of criteria",
                options: [
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.NameContains,
                        description: "One or more words that can be found within the card name",
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.DescriptionContains,
                        description: "One or more words that can be found within the card's description",
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.LevelUpContains,
                        description: "One or more words that can be found within the champion's level up text",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.AttackEquals,
                        description: "The unit's attack is equal to",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.AttackGreater,
                        description: "The unit's attack is greater than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.AttackLess,
                        description: "The unit's attack is less than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.HealthEquals,
                        description: "The unit's health is equal to",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.HealthGreater,
                        description: "The unit's health is greater than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.HealthLess,
                        description: "The unit's health is less than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.CostEquals,
                        description: "The unit's cost is equal to",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.CostGreater,
                        description: "The unit's cost is greater than",
                    },
                    {
                        type: CommandOptionType.INTEGER,
                        name: FilterType.CostLess,
                        description: "The unit's cost is less than",
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.HasKeyword,
                        description: "The unit has the keyword",
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.HasSupertype,
                        description: "The unit has the supertype",
                        choices: Array.from(choices.supertypes.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.HasType,
                        description: "The card has the type",
                        choices: Array.from(choices.types.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.HasSubtype,
                        description: "The card has the subtype",
                        choices: Array.from(choices.subtypes.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.FromRegion,
                        description: "The card comes from the region",
                        choices: Array.from(choices.regions.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.FromSet,
                        description: "The card comes from the set",
                        choices: Array.from(choices.sets.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.SpellSpeed,
                        description: "The spell has the speed",
                        choices: Array.from(choices.speeds.values())
                    },
                    {
                        type: CommandOptionType.STRING,
                        name: FilterType.HasRarity,
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

/**
 * Populates the Terms table
 */
async function iterateTerms(dragon: rune.DataDragon){
    console.log("Loading term database");
    const bundle = await dragon.getCoreBundle(rune.Locale.English, "latest");
    const global = await bundle.getGlobalData();
    console.log("Bundle downloaded");
    for (let termBatch of batch(25, concat(global.vocabTerms, global.keywords))){
        const rawInput = Array.from(termBatch).map(it => Term.putBatch(it));
        console.log(JSON.stringify(rawInput));
        await Term.table.batchWrite(rawInput);
    }
    console.log("Term database built successfully");
}

export async function handler() {
    const dragon = new rune.DataDragon({});
    const choices = await iterateCards(dragon);
    await iterateTerms(dragon);
    await registerCommands(choices);
    return "Setup completed";
}

// Hack to allow us to execute this script directly, when developing
if (require.main === module) {
    handler();
}
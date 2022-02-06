import {getSlashEnv} from "./common";
import * as rune from "lor-data-dragon";

import {DynamoDBDocument} from "@aws-sdk/lib-dynamodb"; // ES6 import
import {DynamoDB} from "@aws-sdk/client-dynamodb"; // ES6 import
import {
    APIApplicationCommandOptionChoice,
    ApplicationCommandOptionType,
    Routes,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord-api-types/v9";

const {REST} = require('@discordjs/rest');


function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function union<T>(setA: Iterable<T>, setB: Iterable<T>): Set<T> {
    return new Set([
        ...setA,
        ...setB
    ]);
}

async function pushCardBatch(ddbDocClient: DynamoDBDocument, batch: any[]) {
    if (!process.env.AWS_TABLE_NAME) {
        throw new Error("AWS_TABLE_NAME must be specified");
    }
    // Loop until it succeeds
    while (true) {
        try {
            await ddbDocClient.batchWrite({
                RequestItems: {
                    [process.env.AWS_TABLE_NAME]: batch
                }
            });
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
        keywords: new Set(),
        regions: new Set(),
        sets: new Set(),
        speeds: new Set(),
        rarities: new Set(),
        subtypes: new Set(),
        supertypes: new Set(),
        types: new Set(),
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
                ret.speeds.add(card.spellSpeed);
            }
            if (card.rarity) {
                ret.rarities.add(card.rarity);
            }
            if (card.type) {
                ret.types.add(card.type);
            }
            if (card.supertype) {
                ret.supertypes.add(card.supertype);
            }
            if (card.set) {
                const setNumber = parseInt(card.set.slice(-1));
                ret.sets.add(rune.Set[setNumber]);
            }

            ret.keywords = union(ret.keywords, card.keywords);
            ret.regions = union(ret.regions, card.regions);
            ret.subtypes = union(ret.subtypes, card.subtypes);

            cards.push({
                PutRequest: {
                    Item: card
                }
            });

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
    keywords: Set<string>,
    regions: Set<string>,
    subtypes: Set<string>,
    supertypes: Set<string>,
    types: Set<string>,
    rarities: Set<string>,
    speeds: Set<string>,
    sets: Set<string>,
}

function stringToOption(opts: Iterable<string>): APIApplicationCommandOptionChoice<string>[] {
    return Array.from(opts).map(opt => ({
        name: opt,
        value: opt
    }));
}

async function registerCommands(choices: Choices) {
    const env = getSlashEnv();
    const rest = new REST({version: '9'}).setToken(env.token);

// Create Global Command
    const cmd: RESTPostAPIChatInputApplicationCommandsJSONBody = {
        name: "lorcard",
        description: "Retrieves a Legends of Runeterra card matching a set of criteria",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "name_contains",
                description: "One or more words that can be found within the card name",
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "description_contains",
                description: "One or more words that can be found within the card's description",
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "level_up_description",
                description: "One or more words that can be found within the champion's level up text",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "attack_equals",
                description: "The unit's attack is equal to",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "attack_greater",
                description: "The unit's attack is greater than",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "attack_less",
                description: "The unit's attack is less than",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "health_equals",
                description: "The unit's health is equal to",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "health_greater",
                description: "The unit's health is greater than",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "health_less",
                description: "The unit's health is less than",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "cost_equals",
                description: "The unit's cost is equal to",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "cost_greater",
                description: "The unit's cost is greater than",
            },
            {
                type: ApplicationCommandOptionType.Integer,
                name: "cost_less",
                description: "The unit's cost is less than",
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "has_keyword",
                description: "The unit has the keyword",
                // choices: stringToOption(choices.keywords)
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "has_supertype",
                description: "The unit has the supertype",
                choices: stringToOption(choices.supertypes)
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "has_type",
                description: "The unit has the type",
                choices: stringToOption(choices.types)
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "has_subtype",
                description: "The unit has the subtype",
                choices: stringToOption(choices.subtypes)
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "from_region",
                description: "The card comes from the region",
                choices: stringToOption(choices.regions)
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "from_set",
                description: "The card comes from the set",
                choices: stringToOption(choices.sets)
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "spell_speed",
                description: "The spell has the speed",
                choices: stringToOption(choices.speeds)
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "rarity",
                description: "The card has the rarity",
                choices: stringToOption(choices.rarities)
            },
        ],
    };
    if (process.env.DISCORD_GUILD_ID) {
        await rest.put(
            Routes.applicationGuildCommands(env.applicationID, process.env.DISCORD_GUILD_ID),
            {body: [cmd]},
        );
    }
    else {
        await rest.put(
            Routes.applicationCommands(env.applicationID),
            {body: [cmd]},
        );
    }
}

export async function handler() {
    const dragon = new rune.DataDragon({
        cacheDir: "./runeCache"
    });
    const choices = await iterateCards(dragon);
    await registerCommands(choices);
    return "Setup completed";
}

if (require.main === module) {
    handler();
}
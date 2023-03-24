import {CommandContext, CommandOptionType, SlashCommand, SlashCreator} from 'slash-create';
import * as path from "path";
import * as fs from "fs";
import * as fsprom from "fs/promises";

interface Asset {
    gameAbsolutePath: string,
    fullAbsolutePath: string
}

enum Rarity {
    Common = "common",
    Rare = "rare",
    Epic = "epic",
    Champion = "champion"
}

enum SpellSpeed {
    Burst = "burst",
    Fast = "fast",
    Slow = "slow",
    Focus = "focus"
}

interface Card {
    associatedCards: any[],
    associatedCardRefs: string[],
    assets: Asset[],
    regions: string[],
    regionRefs: string[],
    attack: number,
    cost: number,
    health: number,
    description: string,
    descriptionRaw: string,
    levelUpDescription: string,
    levelUpDescriptionRaw: string,
    flavorText: string,
    artistName: string,
    name: string,
    cardCode: string
    keywords: string[],
    keywordRefs: string[],
    spellSpeed: SpellSpeed,
    spellSpeedRef: SpellSpeed,
    rarity : Rarity,
    rarityRef: Rarity,
    subtypes: string[],
    supertype: string,
    type: string,
    collectible: boolean,
    set: string
}

// Load the data at module load time, so that it will be cached over multiple invocations
const ROOT_PATH = path.resolve(__dirname + "/../en_us");
const DATA_DIR = path.join(ROOT_PATH, "data");
const IMG_DIR = path.join(ROOT_PATH, "img/cards");
let DATA_JSON: Card[];
for (const dirent of fs.readdirSync(DATA_DIR, {withFileTypes: true})){
    if (dirent.isFile()) {
        const jsonPath = path.join(DATA_DIR, dirent.name);
        const contents = fs.readFileSync(jsonPath, "utf-8");
        DATA_JSON = JSON.parse(contents);
        break;
    }
}

export default class CardCommand extends SlashCommand {
    constructor(creator: SlashCreator) {
        super(creator, {
                name: 'lorcard',
                description: 'Shows the the art and text for a Legends of Runeterra card',
                guildIDs: [process.env.DISCORD_GUILD!],
                options: [
                    {
                        name: "query",
                        description: "A search term for Runeterra card names. Partial matching is allowed.",
                        type: CommandOptionType.STRING
                    }
                ]
            }
        );
        this.filePath = __filename;
    }

    async run(ctx: CommandContext) {
        await ctx.defer();
        const search = ctx.options.query;
        const hit = DATA_JSON.find(card => card.name.includes(search));
        if (hit){
            const artFilename = hit.cardCode + '.png';
            const artFilepath = path.join(IMG_DIR, artFilename)
            const buff = await fsprom.readFile(artFilepath);
            if (buff) {
                try {
                    await ctx.send({
                        file: {
                                file: buff,
                                name: artFilename
                            },
                        embeds: [
                            {
                                image: {
                                    url: `attachment://${artFilename}`
                                }
                            }
                        ]
                    });
                    return;
                }
                catch (e){
                    console.error(e)
                }
            }
        }
            await ctx.send({
                content: `Failed`
            });
    }
}

// export default (...args: Tuple<any>) => {
//     return new CardCommand(...args);
// };
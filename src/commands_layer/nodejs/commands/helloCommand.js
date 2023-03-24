"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_create_1 = require("slash-create");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fsprom = __importStar(require("fs/promises"));
var Rarity;
(function (Rarity) {
    Rarity["Common"] = "common";
    Rarity["Rare"] = "rare";
    Rarity["Epic"] = "epic";
    Rarity["Champion"] = "champion";
})(Rarity || (Rarity = {}));
var SpellSpeed;
(function (SpellSpeed) {
    SpellSpeed["Burst"] = "burst";
    SpellSpeed["Fast"] = "fast";
    SpellSpeed["Slow"] = "slow";
    SpellSpeed["Focus"] = "focus";
})(SpellSpeed || (SpellSpeed = {}));
// Load the data at module load time, so that it will be cached over multiple invocations
const ROOT_PATH = path.resolve(__dirname + "/../en_us");
const DATA_DIR = path.join(ROOT_PATH, "data");
const IMG_DIR = path.join(ROOT_PATH, "img/cards");
let DATA_JSON;
for (const dirent of fs.readdirSync(DATA_DIR, { withFileTypes: true })) {
    if (dirent.isFile()) {
        const jsonPath = path.join(DATA_DIR, dirent.name);
        const contents = fs.readFileSync(jsonPath, "utf-8");
        DATA_JSON = JSON.parse(contents);
        break;
    }
}
class CardCommand extends slash_create_1.SlashCommand {
    constructor(creator) {
        super(creator, {
            name: 'lorcard',
            description: 'Shows the the art and text for a Legends of Runeterra card',
            guildIDs: [process.env.DISCORD_GUILD],
            options: [
                {
                    name: "query",
                    description: "A search term for Runeterra card names. Partial matching is allowed.",
                    type: slash_create_1.CommandOptionType.STRING
                }
            ]
        });
        this.filePath = __filename;
    }
    run(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            yield ctx.defer();
            const search = ctx.options.query;
            const hit = DATA_JSON.find(card => card.name.includes(search));
            if (hit) {
                const artFilename = hit.cardCode + '.png';
                const artFilepath = path.join(IMG_DIR, artFilename);
                const buff = yield fsprom.readFile(artFilepath);
                if (buff) {
                    try {
                        yield ctx.send({
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
                    catch (e) {
                        console.error(e);
                    }
                }
            }
            yield ctx.send({
                content: `Failed`
            });
        });
    }
}
exports.default = CardCommand;
// export default (...args: Tuple<any>) => {
//     return new CardCommand(...args);
// };

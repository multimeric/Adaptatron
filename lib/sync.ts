import {SlashCreator} from "slash-create";
import {commands, getSlashEnv} from "./common"
import * as path from "path";

export function handler() {
    // Sync all commands before publishing
    const creator = new SlashCreator(getSlashEnv());
    creator
        .registerCommands(commands)
        .syncCommands();
    return "Commands synced";
}



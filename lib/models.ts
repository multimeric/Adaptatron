import "reflect-metadata"
import {Entity, Table} from "dynamodb-toolbox";
import {DocumentClient} from "aws-sdk/clients/dynamodb";

const cardTable = new Table({
    name: process.env.AWS_TABLE_NAME || "SomeTable",
    partitionKey: "cardCode",
    DocumentClient: new DocumentClient({
        region: process.env.AWS_DEFAULT_REGION || "us-east-1"
    })
})

export const Card = new Entity({
    name: "Card",
    table: cardTable,
    attributes: {
        cardCode: {
            partitionKey: true,
            type: "string"
        },
        "associatedCards": "list",
        "associatedCardRefs": "list",
        "assets": "list",
        "regions": "list",
        "regionRefs": "list",
        "attack": "number",
        "cost": "number",
        "health": "number",
        "description": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "descriptionRaw": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "levelupDescription": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "levelupDescriptionRaw": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "flavorText": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "artistName": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "name": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "keywords": "list",
        "keywordRefs": "list",
        "spellSpeed": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "spellSpeedRef": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "rarity": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "rarityRef": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "subtypes": "list",
        "supertype": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "type": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        },
        "collectible": "boolean",
        "set": {
            transform: (val: string) => val.toLowerCase(),
            type: "string"
        }
    }
});

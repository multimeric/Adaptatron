import {Entity, Table} from "dynamodb-toolbox";
import {DocumentClient} from "aws-sdk/clients/dynamodb";

const client = new DocumentClient({
    region: process.env.AWS_DEFAULT_REGION || "us-east-1"
});

export const Card = new Entity({
    name: "Card",
    table: new Table({
        // Put in a default value so that this doesn't fail when imported by CDK
        name: process.env.AWS_CARD_TABLE_NAME || "SomeTable",
        partitionKey: "cardCode",
        DocumentClient: client
    }),
    autoParse: true,
    autoExecute: true,
    attributes: {
        // We lowercase all string variables to make searching easier
        cardCode: {
            partitionKey: true,
            type: "string"
        },
        "associatedCards": "list",
        "associatedCardRefs": "list",
        "assets": "list",
        "regions": {
            type: "list",
            transform: ((val: string[]) => val.map(item => item.toLowerCase()))
        },
        "regionRefs": {
            type: "list",
            transform: ((val: string[]) => val.map(item => item.toLowerCase()))
        },
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
            type: "string"
        },
        "searchName": {
            // Lowercased version of the name for search purposes
            default: (data: any) => data.name.toLowerCase(),
            type: "string"
        },
        "keywords": {
            type: "list",
            transform: ((val: string[]) => val.map(item => item.toLowerCase()))
        },
        "keywordRefs": {
            type: "list",
            transform: ((val: string[]) => val.map(item => item.toLowerCase()))
        },
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
        "subtypes": {
            type: "list",
            transform: ((val: string[]) => val.map(item => item.toLowerCase()))
        },
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

export const Term = new Entity({
    name: "Term",
    table: new Table({
        // Put in a default value so that this doesn't fail when imported by CDK
        name: process.env.AWS_TERM_TABLE_NAME || "SomeTable",
        partitionKey: "nameRef",
        DocumentClient: client,
        indexes: {
            searchName: {
                partitionKey: "searchName"
            }
        }
    }),
    autoParse: true,
    autoExecute: true,
    attributes: {
        nameRef: {
            type: "string",
            partitionKey: true,
        },
        "name": {type: "string"},
        "searchName": {
            type: "string",
            default: (data: any) => data.name.trim().toLowerCase(),
        },
        "description": {type: "string"},
        "searchDescription": {
            type: "string",
            default: (data: any) => data.description.trim().toLowerCase()
        }
    }
});

import {getSlashEnv} from "./common";
import {AWSLambdaServer, CommandContext, MessageOptions, SlashCreator} from "slash-create";
import {Card, Term} from "./models"
import {FilterType, Command} from "./types";
import {FilterExpressions} from "dynamodb-toolbox/dist/lib/expressionBuilder";
import {InvocationType, InvokeCommand, LambdaClient} from "@aws-sdk/client-lambda";
import {APIGatewayProxyCallbackV2, APIGatewayProxyEventV2, Context} from "aws-lambda"
import * as rune from "lor-data-dragon";
import {titleCase} from "title-case";

function _makeContainsFilter(field: string, value: string): any[] {
    return value.split(" ").map(word => ({
        attr: field,
        contains: word
    }));
}

/**
 * Run in response to the API Gateway request. Defers the response and then calls the next lambda
 */
async function runDefer(ctx: CommandContext, data: APIGatewayProxyEventV2) {
    console.log("Running defer");

    // Tell discord to wait
    await ctx.defer();

    console.log("Preparing to invoke lambda");

    // Indicate this has already been deferred
    data.headers.I_DEFERRED_THIS = "true";

    // Start a new lambda
    await new LambdaClient({}).send(new InvokeCommand({
        FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        InvocationType: InvocationType.Event,
        Payload: Buffer.from(JSON.stringify(data))
    }));

    console.log("Success. Terminating.");
}

async function cardReply(ctx: CommandContext) {
    try {

        const filters: FilterExpressions = [];
        for (let [key, value] of Object.entries(ctx.options)) {
            switch (key) {
                case FilterType.NameContains:
                    filters.splice(0, 0, ..._makeContainsFilter("searchName", value.toLowerCase()));
                    break;
                case FilterType.DescriptionContains:
                    filters.splice(0, 0, ..._makeContainsFilter("description", value.toLowerCase()));
                    break;
                case FilterType.LevelUpContains:
                    filters.splice(0, 0, ..._makeContainsFilter("levelupDescriptionRaw", value.toLowerCase()));
                    break;
                case FilterType.AttackEquals:
                    filters.push({attr: "attack", eq: value});
                    // If the user is querying attack, they probably want a unit
                    filters.push({attr: "type", eq: "unit"});
                    break;
                case FilterType.AttackGreater:
                    filters.push({attr: "attack", gt: value});
                    filters.push({attr: "type", eq: "unit"});
                    break;
                case FilterType.AttackLess:
                    filters.push({attr: "attack", lt: value});
                    filters.push({attr: "type", eq: "unit"});
                    break;
                case FilterType.HealthEquals:
                    filters.push({attr: "health", eq: value});
                    filters.push({attr: "type", eq: "unit"});
                    break;
                case FilterType.HealthGreater:
                    filters.push({attr: "health", gt: value});
                    filters.push({attr: "type", eq: "unit"});
                    break;
                case FilterType.HealthLess:
                    filters.push({attr: "health", lt: value});
                    filters.push({attr: "type", eq: "unit"});
                    break;
                case FilterType.CostEquals:
                    filters.push({attr: "cost", eq: value});
                    break;
                case FilterType.CostGreater:
                    filters.push({attr: "cost", gt: value});
                    break;
                case FilterType.CostLess:
                    filters.push({attr: "cost", lt: value});
                    break;
                case FilterType.HasKeyword:
                    // We have to search the raw keywords since this isn't an enum - it's a user string
                    filters.push({attr: "keywords", contains: value.toLowerCase()});
                    break;
                case FilterType.HasSupertype:
                    filters.push({attr: "supertype", eq: value.toLowerCase()})
                    break;
                case FilterType.FromSet:
                    filters.push({attr: "set", eq: value.toLowerCase()})
                    break;
                case FilterType.SpellSpeed:
                    filters.push({attr: "spellSpeedRef", eq: value.toLowerCase()})
                    break;
                case FilterType.HasType:
                    filters.push({attr: "type", eq: value.toLowerCase()})
                    break;
                case FilterType.HasSubtype:
                    filters.push({attr: "subtypes", contains: value.toLowerCase()})
                    break;
                case FilterType.FromRegion:
                    filters.push({attr: "regionRefs", contains: value.toLowerCase()})
                    break;
                case FilterType.HasRarity:
                    filters.push({attr: "rarityRef", eq: value.toLowerCase()})
                    break;
            }
        }
        console.log("Filters compiled, running scan");
        const items: rune.Card[] = [];
        let res = await Card.scan({
            attributes: ["assets", "name"],
            filters
        });
        items.splice(0, 0, ...res.Items);

        // Add additional hits from subsequent scans
        while (res.next) {
            res = await res.next()
            items.splice(0, 0, ...res.Items);
        }
        console.log("Scan completed");
        console.log(`${items.length} items returned`);
        let content: MessageOptions;
        if (items.length > 0) {
            // Show full embeds for the first 4 images
            const fullResults = items.slice(0, 4);
            // Show only the count for the remaining results
            const remainingResults = items.slice(4);
            const contentPrefix = fullResults.map(card => titleCase(card.name)).join(', ');
            const contentSuffix = remainingResults.length == 0 ? "" : `, and ${remainingResults.length} other results`;
            content = {
                content: contentPrefix + contentSuffix,
                // This hack is explained here: https://github.com/discord/discord-api-docs/discussions/3253#discussioncomment-952628
                embeds: fullResults.map(card => ({
                    url: items[0].assets[0].gameAbsolutePath,
                    image: {
                        url: card.assets[0].gameAbsolutePath
                    }
                }))
            };
            console.log(`Sending follow-up with content ${JSON.stringify(content)}`);
        } else {
            content = {
                ephemeral: true,
                content: "No results found"
            }
        }
        // This is sent to the discord API, so it doesn't matter that we aren't responding to a webhook
        await ctx.sendFollowUp(content)
    } catch (e) {
        await ctx.sendFollowUp({
            ephemeral: true,
            content: "Error processing request"
        })
        console.error(e);
    }
}

/**
 * Handle the lordefine command
 * @param ctx
 */
async function defineReply(ctx: CommandContext) {
    console.log("Handling a define query");
    try {
        const query = ctx.options.term.trim().toLowerCase()
        console.log(`query was ${query}`);
        // We can do an index lookup here
        const terms = await Term.query({
            index: "searchName"
        }, query);
        console.log(`We received ${JSON.stringify(terms)}`);
        const term = terms.Items[0];
        console.log(`The first hit was ${JSON.stringify(term)}`);
        await ctx.sendFollowUp({
            embeds: [
                {
                    title: term.name,
                    description: term.description
                }
            ]
        });
    } catch (e) {
        await ctx.sendFollowUp({
            ephemeral: true,
            content: "Unknown term"
        })
    }
}

async function runReply(ctx: CommandContext) {
    console.log("Running the query");
    switch (ctx.commandName) {
        case Command.Card:
            return cardReply(ctx);
        case Command.Define:
            return defineReply(ctx);
    }

}

// This defines the lambda.interactions endpoint
const creator = new SlashCreator({
    handleCommandsManually: true,
    ...getSlashEnv()
});

let globalEvent: APIGatewayProxyEventV2;
creator
    .withServer(new AWSLambdaServer(module.exports, "interactions"))
    .on("rawRequest", (treq)=>{
        // Keep track of the global request object, since we need to forward it to the next lambda
        globalEvent = treq.body;
    })
    .on('commandInteraction', (interaction, respond, webserverMode) => {
        const ctx = new CommandContext(
            creator,
            interaction,
            respond,
            webserverMode
        );
        if (globalEvent.headers.I_DEFERRED_THIS) {
            runReply(ctx);
        } else {
            runDefer(ctx, globalEvent);
        }
    });

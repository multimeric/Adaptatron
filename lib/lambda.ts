import {getSlashEnv} from "./common";
import {AWSLambdaServer, CommandContext, MessageOptions, SlashCreator} from "slash-create";
import {Card} from "./models"
import {CardFilter} from "./cardFilter";
import {FilterExpressions} from "dynamodb-toolbox/dist/lib/expressionBuilder";
import {InvocationType, InvokeCommand, LambdaClient} from "@aws-sdk/client-lambda";
import {APIGatewayProxyCallbackV2, APIGatewayProxyEventV2, Context} from "aws-lambda"
import * as rune from "lor-data-dragon";

function _makeContainsFilter(field: string, value: string): any[] {
    return value.split(" ").map(word => ({
        attr: field,
        contains: word
    }));
}

/**
 * Run in response to the API Gateway request. Defers the response and then calls the next lambda
 */
async function run_defer(ctx: CommandContext, data: APIGatewayProxyEventV2) {
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

async function run_reply(ctx: CommandContext, data: APIGatewayProxyEventV2) {
    console.log("Running the query");

    try {

        const filters: FilterExpressions = [];
        for (let [key, value] of Object.entries(ctx.options)) {
            switch (key) {
                case CardFilter.NameContains:
                    filters.splice(0, 0, ..._makeContainsFilter("name", value.toLowerCase()));
                    break;
                case CardFilter.DescriptionContains:
                    filters.splice(0, 0, ..._makeContainsFilter("description", value.toLowerCase()));
                    break;
                case CardFilter.LevelUpContains:
                    filters.splice(0, 0, ..._makeContainsFilter("levelupDescriptionRaw", value.toLowerCase()));
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
                    // We have to search the raw keywords since this isn't an enum - it's a user string
                    filters.push({attr: "keywords", contains: value.toLowerCase()});
                    break;
                case CardFilter.HasSupertype:
                    filters.push({attr: "supertype", eq: value.toLowerCase()})
                    break;
                case CardFilter.FromSet:
                    filters.push({attr: "set", eq: value.toLowerCase()})
                    break;
                case CardFilter.SpellSpeed:
                    filters.push({attr: "spellSpeedRef", eq: value.toLowerCase()})
                    break;
                case CardFilter.HasType:
                    filters.push({attr: "type", eq: value.toLowerCase()})
                    break;
                case CardFilter.HasSubtype:
                    filters.push({attr: "subtypes", contains: value.toLowerCase()})
                    break;
                case CardFilter.FromRegion:
                    filters.push({attr: "regionRefs", contains: value.toLowerCase()})
                    break;
                case CardFilter.HasRarity:
                    filters.push({attr: "rarityRef", eq: value.toLowerCase()})
                    break;
            }
        }
        console.log("Filters compiled, running scan");
        const items: rune.Card[] = [];
        let res = await Card.scan({
            attributes: ["assets"],
            filters
        });
        items.splice(0, 0, ...res.Items);

        // Add additional hits from subsequent scans
        while (res.next){
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
            content = {
                content: remainingResults.length == 0 ? undefined : `${remainingResults.length} other results`,
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

// This defines the lambda.interactions endpoint
const creator = new SlashCreator({
    handleCommandsManually: true,
    ...getSlashEnv()
});

// Don't actually export the real handler, instead handle with the below function
const server = new AWSLambdaServer({}, "interactions");

creator
    .withServer(server)
    .on('commandInteraction', (interaction, respond, webserverMode) => {
        const ctx = new CommandContext(
            creator,
            interaction,
            respond,
            webserverMode
        );
        if (globalEvent.headers.I_DEFERRED_THIS) {
            run_reply(ctx, globalEvent);
        } else {
            run_defer(ctx, globalEvent);
        }
    });

let globalEvent: APIGatewayProxyEventV2;

export function interactions(event: APIGatewayProxyEventV2, context: Context, callback: APIGatewayProxyCallbackV2) {
    console.log(JSON.stringify(event));
    globalEvent = event;
    // @ts-ignore
    server._onRequest(event, context, callback);
}
# DiscordTypescriptLambda

This is a template repository to quickly and easily get your discord bot running, most likely for free due to the extremely low operation costs of running on AWS Lambda.

## Why Use This?

- AWS Lambda is incredibly cheap to run. Under the [free tier](https://aws.amazon.com/free/), you get 1 million free invocations per month, which corresponds to 1 million bot interactions each month. Even after you exceed this limit, it only costs you $0.20 USD to run another million interactions!
- Local development is supported by this template, which is the easiest way to rapidly develop your bot on a testing server
- We use CDK for infrastructure, which is a very powerful and accessible way to edit the stack, especially when compared to raw CloudFormation templates
- Typescript provides you with incredible type safety, and will help you catch errors early on

## Installation

- Click "Use this template" on GitHub
- Clone the generated repository
- `cd` into the repository
- Run `npm install`

## Adding Commands

- For each command you want to add (each `/slash` command), create a new file in `lib/commands`. You may want to copy `hello.ts`.
- In the constructor, modify the command metadata using the [following options](https://slash-create.js.org/#/docs/main/latest/typedef/SlashCommandOptions).
- In the `run()` method, implement how to actually handle the command when it is executed
- **Whenever you add a command, you must register it by first importing it, and then including the class in `lib/common.ts`** (at the bottom).

## Local Development

- It's much easier to test out your bot locally than to test it on AWS Lambda
- To test, first export the following variables:
  - `DISCORD_APP_ID`: the "Application ID" of your app, listed on the "General Information" page of the Discord Developer Dashboard.
  - `DISCORD_PUBLIC_KEY`: the "Public Key" of your app, listed in the same place.
  - `DISCORD_BOT_TOKEN`: listed on the "Bot" page of the dashboard.
  - `DISCORD_GUILD_ID`: this is the ID of the server in which you are testing the bot. If you enable discord developer mode, you can get this by right-clicking any server and clicking "Copy ID".
- Then run `npm run dev`

## Deploying to Lambda

- Once you are happy with your bot, get ready to deploy to AWS.
- Export the following variables:
  - `DISCORD_APP_ID`: the "Application ID" of your app, listed on the "General Information" page of the Discord Developer Dashboard.
  - `DISCORD_PUBLIC_KEY`: the "Public Key" of your app, listed in the same place.
  - `AWS_PROFILE`: an AWS profile that has permissions to deploy a CloudFormation stack (e.g. the root account credentials)
- Run `npm run deploy`
- Copy the `CdkStack.discordEndpoint` URL printed in the terminal, and paste it into the field labelled "INTERACTIONS ENDPOINT URL" on the Discord dashboard

## Adding Additional Infrastructure

- This template is designed to be fully extensible, in case you need to add infrastructure such as a database to your app.
- To do this open `lib/cdk-stack.ts`
- For example, to add a DynamoDB (which is easily the cheapest way to add persistent storage), add the following to the bottom of the `cdk-stack.ts`:

```ts
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const handler: lambda.NodejsFunction;

const table = new dynamodb.Table(this, "Table", {
  partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
});

table.grantFullAccess(handler);
```

## Setup Actions

- Your bot may need to run certain actions when it is first deployed.
- For example, if you have added a database you may need to "seed" it with initial data.
- By default the only setup action run in this template is to sync the commands with the Discord API.
- However if you want to add new actions, simply edit `lib/setup.ts` and add additional AWS

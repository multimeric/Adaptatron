# Adaptatron 

Repository for the Adaptatron discord bot: an interactive card search engine for Legends of Runeterra.

## Inviting 

### [Visit this URL to invite Adaptatron to your server](https://discord.com/api/oauth2/authorize?client_id=936919961811714058&scope=applications.commands)

Note that Adaptatron requires almost no permissions: it can't look at any messages or users in the channel.
All it can do is respond to its own commands.

## Bot Usage

Adaptatron provides exactly one command: `/lorcard`. 
Type this in to your chat bar for an explanation of the command and its options.

## Known Issues

* The bot is a bit slow to respond to commands sometimes. This is due to wait time for the Lambda it's hosted on starting up.
* You can't search for more than one keyword/subtype/region currently
* If you provide no options, the bot will just return random cards

## Feedback

Please visit [the issues page](https://github.com/multimeric/Adaptatron/issues) for any feature requests or bug reports. 
Note that you will need a GitHub account to post there.

## Development

### High Level

* Adaptatron uses the new Discord interaction webhook API rather than using a bot account
* The architecture involves:
  * An AWS Lambda that responds to the interaction webhook
  * A DynamoDB table holding all the Runeterra cards

### Hosting it Yourself

* Set up an AWS account and credentials
* Register a new application at <https://discord.com/developers/applications>
* Export the following environment variables:
  - `DISCORD_APP_ID`: the "Application ID" of your app, listed on the "General Information" page of the Discord Developer Dashboard.
  - `DISCORD_PUBLIC_KEY`: the "Public Key" of your app, listed in the same place.
* Deploy the bot using `cdk deploy DiscordBot`, and note the values it outputs
* Invoke the setup lambda, using `aws lambda invoke /dev/stdout --function-name <function name>`, where `<function name>` is the `setupLambda` printed out in the previous step 
* Go to <https://discord.com/developers/applications> and set the "Interactions Endpoint URL" to the `discordEndpoint` printed out by the deployment
* Create an invitation URL in the dashboard under OAuth2 → URL Generator, and tick *only* `applications.commands`
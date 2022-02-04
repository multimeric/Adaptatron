import * as cdk from 'aws-cdk-lib';
import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "@aws-cdk/aws-apigatewayv2-alpha"
import * as apiGatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as cr from "aws-cdk-lib/custom-resources"
import {AwsCustomResourcePolicy} from "aws-cdk-lib/custom-resources"
import {getCdkEnv} from "./common"
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam"

export class DiscordStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const envVars = getCdkEnv();

        // The lambda that runs in response to each bot interaction
        const handler = new lambda.NodejsFunction(this, 'discordInteractions', {
            environment: envVars,
            entry: path.resolve(__dirname, "./lambda.ts"),
            handler: 'interactions',
        });

        // The API that hosts the above lambda
        const gateway = new apigateway.HttpApi(this, 'gateway');
        const route = gateway.addRoutes({
            path: "/event",
            methods: [apigateway.HttpMethod.POST],
            integration: new apiGatewayIntegrations.HttpLambdaIntegration("lambdaIntegration", handler, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_2_0,
            })
        });

        // The lambda that runs once to update the commands for the bot whenever the handler function is created
        // or updated
        const updateCommands = new lambda.NodejsFunction(this, 'updateCommands', {
            environment: envVars,
            entry: path.resolve(__dirname, "./sync.ts"),
            handler: 'handler',
        });

        // This is a trick to make the above lambda run once on create or update
        // See: https://github.com/aws/aws-cdk/issues/10820#issuecomment-844648211
        const hook = {
            apiVersion: "2015-03-31",
            service: "Lambda",
            action: "invoke",
            parameters: {
                FunctionName: updateCommands.functionName,
                InvocationType: 'Event'
            },
            physicalResourceId: cr.PhysicalResourceId.of('JobSenderTriggerPhysicalId')
        }
        const updater = new cr.AwsCustomResource(this, "commandUpdator", {
            policy: AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    actions: ['lambda:InvokeFunction'],
                    effect: iam.Effect.ALLOW,
                    resources: [updateCommands.functionArn]
                })
            ]),
            onCreate: hook,
            onUpdate: hook
        });
        updater.node.addDependency(updateCommands)

        // We return the URL as this is needed to plug into the discord developer dashboard
        new cdk.CfnOutput(this, 'discordEndpoint', {
            value: `${gateway.apiEndpoint}/${route[0].path}`,
            description: 'The Interactions Endpoint URL for your discord bot',
            exportName: 'discordInteractionsUrl',
        });
    }
}

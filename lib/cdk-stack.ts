import * as cdk from "aws-cdk-lib";
import {Duration, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import * as apigateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apiGatewayIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {getCdkEnv} from "./common";
import * as path from "path";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import {AttributeType, ProjectionType} from "aws-cdk-lib/aws-dynamodb"
import * as iam from "aws-cdk-lib/aws-iam"

export class DiscordSupportStack extends Stack {
    cardTable: dynamodb.Table;
    termTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Table for storing card data
        this.cardTable = new dynamodb.Table(this, "cardTable", {
            partitionKey: {
                name: "cardCode", type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            // Maximum amount allowed under free tier
            readCapacity: 20,
            writeCapacity: 20
        });

        // Table for storing terms
        this.termTable = new dynamodb.Table(this, "termTable", {
            partitionKey: {
                name: "nameRef", type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            // Maximum amount allowed under free tier
            readCapacity: 1,
            writeCapacity: 5
        });
        // Allow indexing by term name
        this.termTable.addGlobalSecondaryIndex({
            indexName: "searchName",
            readCapacity: 4,
            partitionKey: {
                type: AttributeType.STRING,
                name: "searchName"
            },
            projectionType: ProjectionType.ALL
        });
    }

}

export interface DiscordStackProps extends StackProps {
    support: DiscordSupportStack
}

export class DiscordStack extends Stack {

    constructor(scope: Construct, id: string, props: DiscordStackProps) {
        super(scope, id, props);

        const envVars = getCdkEnv();

        // Ensure lambdas can access dynamo
        envVars["AWS_CARD_TABLE_NAME"] = props.support.cardTable.tableName
        envVars["AWS_TERM_TABLE_NAME"] = props.support.termTable.tableName

        // The lambda that runs in response to each bot interaction
        const handler = new lambda.NodejsFunction(this, "discordInteractions", {
            environment: envVars,
            entry: path.resolve(__dirname, "./lambda.ts"),
            handler: "interactions",
            runtime: Runtime.NODEJS_14_X,
            bundling: {
                target: "node14"
            },
            timeout: Duration.seconds(10)
        });

        // Allow this lambda to invoke other lambdas, so that it can invoke itself
        // We can't handler.grantInvoke(handler) because that causes a circular dependency
        handler.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: ["*"],
        }))

        // The API that hosts the above lambda
        const gateway = new apigateway.HttpApi(this, "gateway");
        const route = gateway.addRoutes({
            path: "/event",
            methods: [apigateway.HttpMethod.POST],
            integration: new apiGatewayIntegrations.HttpLambdaIntegration(
                "lambdaIntegration",
                handler,
                {
                    payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_2_0,
                }
            ),
        });

        // The lambda that runs once to run setup commands for the bot whenever the handler function is created
        // or updated
        const setupFunction = new lambda.NodejsFunction(this, "setupFunction", {
            environment: envVars,
            entry: path.resolve(__dirname, "./setup.ts"),
            handler: "handler",
            timeout: Duration.minutes(5),
            memorySize: 4096,
            runtime: Runtime.NODEJS_14_X,
            bundling: {
                target: "node14"
            }
        });

        // Allow lambdas to use the tables
        for (const table of [props.support.termTable, props.support.cardTable]){
            for (const fun of [setupFunction, handler]){
                table.grantFullAccess(fun);
            }
        }

        // We return the URL as this is needed to plug into the discord developer dashboard
        new cdk.CfnOutput(this, "discordEndpoint", {
            value: gateway.apiEndpoint + route[0].path,
            description: "The Interactions Endpoint URL for your discord bot",
        });

        // We also return the setup lambda name so it can be invoked
        new cdk.CfnOutput(this, "setupLambda", {
            value: setupFunction.functionName,
            description: "The name of the setup lambda, which you will need to invoke before the app can run",
        });
    }
}

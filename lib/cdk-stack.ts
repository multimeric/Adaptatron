import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apiGatewayIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as cr from "aws-cdk-lib/custom-resources";
import { AwsCustomResourcePolicy } from "aws-cdk-lib/custom-resources";
import { getCdkEnv } from "./common";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";

export class DiscordStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const envVars = getCdkEnv();

    // The lambda that runs in response to each bot interaction
    const handler = new lambda.NodejsFunction(this, "discordInteractions", {
      environment: envVars,
      entry: path.resolve(__dirname, "./lambda.ts"),
      handler: "interactions",
    });

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
    });

    // This is a trick to make the above lambda run once on create or update
    // See: https://github.com/aws/aws-cdk/issues/10820#issuecomment-844648211
    const hook = {
      apiVersion: "2015-03-31",
      service: "Lambda",
      action: "invoke",
      parameters: {
        FunctionName: setupFunction.functionName,
        InvocationType: "Event",
      },
      physicalResourceId: cr.PhysicalResourceId.of(
        "JobSenderTriggerPhysicalId"
      ),
    };
    const updater = new cr.AwsCustomResource(this, "commandUpdater", {
      policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunction"],
          effect: iam.Effect.ALLOW,
          resources: [setupFunction.functionArn],
        }),
      ]),
      onCreate: hook,
      onUpdate: hook,
    });
    updater.node.addDependency(setupFunction);

    // We return the URL as this is needed to plug into the discord developer dashboard
    new cdk.CfnOutput(this, "discordEndpoint", {
      value: gateway.apiEndpoint + route[0].path,
      description: "The Interactions Endpoint URL for your discord bot",
      exportName: "discordInteractionsUrl",
    });

    /*
    Put your infrastructure here, e.g. creating a DynamoDB
    */
  }
}

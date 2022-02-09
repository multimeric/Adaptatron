import * as cdk from "aws-cdk-lib";
import {Duration, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import * as apigateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apiGatewayIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as cr from "aws-cdk-lib/custom-resources";
import {AwsCustomResourcePolicy} from "aws-cdk-lib/custom-resources";
import {getCdkEnv} from "./common";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class DiscordSupportStack extends Stack {
  table: dynamodb.Table;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Table for storing card data
    this.table = new dynamodb.Table(this, "cardTable", {
      partitionKey: {
        name: "cardCode", type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }

}

export interface DiscordStackProps extends StackProps {
  table: dynamodb.Table
}

export class DiscordStack extends Stack {

  constructor(scope: Construct, id: string, props: DiscordStackProps) {
    super(scope, id, props);

    const envVars = getCdkEnv();

    // Ensure lambdas can access dynamo
    envVars["AWS_TABLE_NAME"] = props.table.tableName;


    // The lambda that runs in response to each bot interaction
    const defer = new lambda.NodejsFunction(this, "discordInteractions", {
      environment: envVars,
      entry: path.resolve(__dirname, "./lambda.ts"),
      handler: "interactions",
      runtime: Runtime.NODEJS_14_X,
      bundling: {
        target: "node14"
      }
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
      timeout: Duration.minutes(5),
      memorySize: 4096,
      runtime: Runtime.NODEJS_14_X,
      bundling: {
        target: "node14"
      }
    });

    const stateMachineDefinition = new tasks.LambdaInvoke(this, "invokeDefer", {
       lambdaFunction:
    })
    const startState = new stepfunctions.Pass(this, 'StartState');
    const simpleStateMachine  = new stepfunctions.StateMachine(this, 'SimpleStateMachine', {
      definition: startState,
    });

    // We return the URL as this is needed to plug into the discord developer dashboard
    new cdk.CfnOutput(this, "discordEndpoint", {
      value: gateway.apiEndpoint + route[0].path,
      description: "The Interactions Endpoint URL for your discord bot",
      exportName: "discordInteractionsUrl",
    });

    props.table.grantFullAccess(setupFunction);
    props.table.grantFullAccess(handler);
  }
}

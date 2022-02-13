#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DiscordStack, DiscordSupportStack } from "../lib/cdk-stack";

const app = new cdk.App();
const support = new DiscordSupportStack(app, "AdaptatronSupportDEV", {});
new DiscordStack(app, "AdaptatronDEV", {
    support
});

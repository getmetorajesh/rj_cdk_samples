import * as cdk from "aws-cdk-lib";
import { AttributeType, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import path = require("path");

export class CdkDdbIncrementalExportStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const backupBucket = new Bucket(this, "ExportBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
    });
    console.log("placeholder");

    const tableToBeBacked = new Table(this, "ExportTable", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      stream: StreamViewType.NEW_IMAGE,
    });

    const exportFunction = new Function(this, "ExportFunction", {
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: Code.fromAsset(path.resolve(__dirname, "./scripts/export_to_s3")),
      environment: {
        TABLE_NAME: tableToBeBacked.tableName,
        BUCKET_NAME: backupBucket.bucketName,
      },
    });

    const exportRule = new Rule(this, "ExportRule", {
      schedule: Schedule.cron({ hour: "*", minute: "30" }),
      targets: [new LambdaFunction(exportFunction)],
    });

    tableToBeBacked.grantStreamRead(exportFunction);
    backupBucket.grantReadWrite(exportFunction);
  }
}

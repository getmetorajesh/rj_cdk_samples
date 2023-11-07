const { S3 } = require("@aws-sdk/client-s3");
// const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBClient,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");

const client = new S3({});

const s3 = new S3({});
const dynamodb = new DynamoDBClient();

const tableName = process.env.TABLE_NAME;

exports.handler = async (event, context) => {
  const fullExport = event.fullExport === true;
  let lastExportTime;
  if (!fullExport) {
    const command = new DescribeTableCommand({
      TableName: tableName,
    });

    const response = await dynamodb.send(command);
    console.log(`TABLE ITEM COUNT: ${response.Table.ItemCount}`);

    lastExportTime = response.Table.LastExportTime;
  }

  const exportParams = {
    TableName: tableName,
    ExportFormat: "DYNAMODB_JSON",
    StreamView: "NEW_IMAGE",
    S3Bucket: process.env.BUCKET_NAME,
    S3Prefix: "incremental/",
    ContinuousBackupsExport: "ENABLED",
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
  };

  if (fullExport) {
    console.log("Triggering full export...");
    await dynamodb.exportTableToPointInTime(exportParams).promise();
  } else {
    console.log("Triggering incremental export...");
    exportParams.ExclusiveStartCheckpoint = lastExportTime;
    await dynamodb.exportTableToPointInTime(exportParams).promise();
  }
};

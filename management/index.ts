//#region Imports

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

//#endregion

//#region Configuration

const stack = pulumi.getStack();
const project = pulumi.getProject();

const stackConfig = new pulumi.Config("stack");
const awsConfig = new pulumi.Config("aws");

// Connect stack reference to parent for VPC, see https://www.pulumi.com/docs/intro/concepts/stack/
const vpcStack = new pulumi.StackReference(stackConfig.require("parent-vpc"));

// Build configuration parameters for entire deployment
const config = {
  region: awsConfig.require("region"),
  environment: stack,
  project: project,
  costCenter: new pulumi.Config().get("costcenter") ?? "Core",
  vpc: {
    id: vpcStack.requireOutput("vpc_id").apply((id) => id.toString()),
    name: vpcStack.getOutput("vpc_name"),
  },
};

//#endregion

//#region Execution

// Create bucket for storing trails in
const current = aws.getCallerIdentity({});
const bucket = new aws.s3.Bucket("bucket", {});
const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
  bucket: bucket.id,
  policy: pulumi.all([bucket.id, bucket.id, current]).apply(
    ([bucketId, bucketId1, current]) => `  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Sid": "AWSCloudTrailAclCheck",
              "Effect": "Allow",
              "Principal": {
                "Service": "cloudtrail.amazonaws.com"
              },
              "Action": "s3:GetBucketAcl",
              "Resource": "arn:aws:s3:::${bucketId}"
          },
          {
              "Sid": "AWSCloudTrailWrite",
              "Effect": "Allow",
              "Principal": {
                "Service": "cloudtrail.amazonaws.com"
              },
              "Action": "s3:PutObject",
              "Resource": "arn:aws:s3:::${bucketId1}/prefix/AWSLogs/${current.accountId}/*",
              "Condition": {
                  "StringEquals": {
                      "s3:x-amz-acl": "bucket-owner-full-control"
                  }
              }
          }
      ]
  }
`
  ),
});
const foobar = new aws.cloudtrail.Trail("foobar", {
  s3BucketName: bucket.id,
  s3KeyPrefix: "prefix",
  includeGlobalServiceEvents: false,
});

//#endregion

//#region Exports

export const trail_bucket = bucket;
export const trail_policy = bucketPolicy;
export const trail_management = foobar;

//#endregion

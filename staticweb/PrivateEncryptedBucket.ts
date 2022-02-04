import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { IProvisioner } from "./IProvisioner";
import { Output } from "@pulumi/pulumi/output";

/**
 * Creates a private encrypted S3 bucket with logging ad versioning enabled.
 *
 * @export
 * @class PrivateEncryptedBucket
 * @implements {IProvisioner}
 */
export class PrivateEncryptedBucket implements IProvisioner {
  /**
   * Returns the unique identifier of the bucket.
   *
   * @type {(Output<string> | undefined)}
   * @memberof PrivateEncryptedBucket
   */
  public id: Output<string> | undefined;

  /**
   *
   *
   * @param {string} name
   * @memberof PrivateEncryptedBucket
   */
  public provision(name: string): void {
    const logBucket = new aws.s3.Bucket(name + "-log-bucket", {
      acl: "log-delivery-write",
    });

    const key = new aws.kms.Key(name + "-bucket-key", {
      description: "This key is used to encrypt bucket objects",
      deletionWindowInDays: 10,
    });

    const environment = new pulumi.Config("environment");

    const bucket = new aws.s3.Bucket(name + "-bucket", {
      acl: "private", // Mark bucket as private
      // Can add some tags to the resource
      tags: {
        Environment: environment.require("name"),
        Name: name,
      },
      // Versioning is disabled by default
      versioning: {
        enabled: true,
      },

      // Logging enabled
      loggings: [
        {
          targetBucket: logBucket.id,
          targetPrefix: "log/",
        },
      ],
      // Enabling encryption
      serverSideEncryptionConfiguration: {
        rule: {
          applyServerSideEncryptionByDefault: {
            kmsMasterKeyId: key.arn,
            sseAlgorithm: "aws:kms",
          },
        },
      },
    });

    // Export the name of the bucket
    this.id = bucket.id;
  }
}

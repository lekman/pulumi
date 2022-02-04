import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { IProvisioner } from "./IProvisioner";
import { Output } from "@pulumi/pulumi/output";

/**
 * Creates a Wordpress container service inside a K8s cluster.
 *
 * @export
 * @class WordpressContainerService
 * @implements {IProvisioner}
 */
export class WordpressContainerService implements IProvisioner {
  /**
   * Returns the unique identifier of the service.
   *
   * @type {(Output<string> | undefined)}
   * @memberof PrivateEncryptedBucket
   */
  public id: Output<string> | undefined;

  /**
   * Provisions the Wordpress service.
   *
   * @param {string} name
   * @memberof PrivateEncryptedBucket
   */
  public provision(name: string): void {}
}

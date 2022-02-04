import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import { IProvisioner } from "./IProvisioner";

/**
 * Creates a Kubernetes cluster.
 *
 * @export
 * @class ContainerCluster
 * @implements {IProvisioner}
 */
export class ContainerCluster implements IProvisioner {
  /**
   * Returns the unique identifier of the service.
   *
   * @type {(Output<any> | undefined)}
   * @memberof PrivateEncryptedBucket
   */
  public config: any | undefined;

  /**
   * Returns the cluster service name.
   *
   * @type {(pulumi.Output<string> | undefined)}
   * @memberof ContainerCluster
   */
  public serviceName: pulumi.Output<string> | undefined;

  /**
   * Returns the cluster service host name.
   *
   * @type {(pulumi.Output<string> | undefined)}
   * @memberof ContainerCluster
   */
  public serviceHostname: pulumi.Output<string> | undefined;

  /**
   * Returns the namespace name.
   *
   * @type {(pulumi.Output<string> | undefined)}
   * @memberof ContainerCluster
   */
  public namespaceName: pulumi.Output<string> | undefined;

  /**
   * Returns the deployment name.
   *
   * @type {(pulumi.Output<string> | undefined)}
   * @memberof ContainerCluster
   */
  public deploymentName: pulumi.Output<string> | undefined;

  /**
   * Creates a Kubernetes cluster.
   *
   * @param {string} name
   * @param {{}} args
   * @memberof PrivateEncryptedBucket
   */
  public provision(name: string): void {
    const config = new pulumi.Config("k8s");
    const environment = new pulumi.Config("environment").require("name");

    // Create an EKS cluster with non-default configuration
    const vpc = new awsx.ec2.Vpc(name + "-k8s-vpc-" + environment, {
      subnets: [{ type: "public" }],
    });

    const cluster = new eks.Cluster(name + "-k8s-" + environment, {
      vpcId: vpc.id,
      subnetIds: vpc.publicSubnetIds,
      desiredCapacity: parseInt(config.require("desiredCapacity")),
      minSize: 1,
      maxSize: parseInt(config.require("maxSize")),
      storageClasses: "gp2",
      deployDashboard: false,
    });

    // Export the clusters' kubeconfig.
    this.config = cluster.kubeconfig;

    // Create a Kubernetes Namespace
    const ns = new k8s.core.v1.Namespace(
      name + "-k8s-ns-" + environment,
      {},
      { provider: cluster.provider }
    );

    // Export the Namespace name
    this.namespaceName = ns.metadata.apply((m) => m.name);

    // Create a NGINX Deployment
    const appLabels = { appClass: name };
    const deployment = new k8s.apps.v1.Deployment(
      name + "-k8s-deploy-" + environment,
      {
        metadata: {
          namespace: this.namespaceName,
          labels: appLabels,
        },
        spec: {
          replicas: 1,
          selector: { matchLabels: appLabels },
          template: {
            metadata: {
              labels: appLabels,
            },
            spec: {
              containers: [
                {
                  name: name,
                  image: "nginx:latest",
                  ports: [{ name: "http", containerPort: 80 }],
                },
              ],
            },
          },
        },
      },
      {
        provider: cluster.provider,
      }
    );

    // Export the Deployment name
    this.deploymentName = deployment.metadata.apply((m) => m.name);

    // Create a LoadBalancer Service for the NGINX Deployment
    const service = new k8s.core.v1.Service(
      name + "-k8s-svc-" + environment,
      {
        metadata: {
          labels: appLabels,
          namespace: this.namespaceName,
        },
        spec: {
          type: "LoadBalancer",
          ports: [{ port: 80, targetPort: "http" }],
          selector: appLabels,
        },
      },
      {
        provider: cluster.provider,
      }
    );

    // Export the Service name and public LoadBalancer Endpoint
    this.serviceName = service.metadata.apply((m) => m.name);
    this.serviceHostname = service.status.apply(
      (s) => s.loadBalancer.ingress[0].hostname
    );
  }
}

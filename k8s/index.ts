//#region Imports

import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";

//#endregion

//#region Configuration

const stack = pulumi.getStack();
const project = pulumi.getProject();

const stackConfig = new pulumi.Config("stack");
const awsConfig = new pulumi.Config("aws");
const kubeConfig = new pulumi.Config("k8s");

// Connect stack reference to parent for VPC, see https://www.pulumi.com/docs/intro/concepts/stack/
const parent = new pulumi.StackReference(stackConfig.require("parent"));

// Build configuration parameters for entire deployment
const config = {
  region: awsConfig.require("region"),
  environment: stack,
  project: project,
  costCenter: new pulumi.Config().get("costcenter") ?? "Core",
  vpc: {
    id: parent.requireOutput("vpc_id").apply((id) => id.toString()),
    name: parent.getOutput("vpc_name"),
  },
  kube: {
    name: kubeConfig.get("name") ?? stack + "-" + project,
    desiredCapacity: kubeConfig.requireNumber("desiredCapacity"),
    minSize: kubeConfig.getNumber("minSize") ?? 2,
    maxSize: kubeConfig.requireNumber("maxSize"),
    publicSubnets: parent.requireOutput("public_subnets"),
  },
};

//#endregion

//#region Execution

// Provision the cluster within existing VPC and subnets
const cluster = new eks.Cluster(config.kube.name, {
  vpcId: config.vpc.id,
  subnetIds: config.kube.publicSubnets,
  desiredCapacity: config.kube.desiredCapacity,
  minSize: config.kube.minSize,
  maxSize: config.kube.maxSize,
  storageClasses: "gp2",
  deployDashboard: false,
  tags: {
    Name: `${config.kube.name}`,
    CostCenter: `${config.costCenter}`,
    Stack: `pulumi:${project}/${stack}`,
    ResourceGroup: stack,
  },
});

//#endregion

//#region Exports

// Export the clusters' kubeconfig and service info
export const kubeconfig = cluster.kubeconfig;
export const name = config.kube.name;

//#endregion

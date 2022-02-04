//#region Imports

import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

//#endregion

//#region Configuration

const stack = pulumi.getStack();
const project = pulumi.getProject();
const vpcConfig = new pulumi.Config("vpc");
const awsConfig = new pulumi.Config("aws");

const config = {
  region: awsConfig.require("region"),
  environment: stack,
  project: project,
  costCenter: new pulumi.Config().get("costcenter") ?? "Core",
  vpc: {
    name: project + "-" + stack,
    cidr: vpcConfig.require("cidr"),
    zones: vpcConfig.requireNumber("azs"),
    nats: vpcConfig.requireNumber("azs"),
  },
};

//#endregion

//#region Execution

// Create VPC with subnets, AZs, private/public subnets, Internet Gateway and
// NAT gateway for the private subnets
const vpc = new awsx.ec2.Vpc(config.vpc.name, {
  cidrBlock: config.vpc.cidr,
  numberOfAvailabilityZones: config.vpc.zones,
  numberOfNatGateways: config.vpc.nats,
  tags: {
    Name: `${config.vpc.name}`,
    CostCenter: `${config.costCenter}`,
    Stack: `pulumi:${project}/${stack}`,
  },
});

//#endregion

//#region Exports

// Export identifiers for use later on
export const vpc_id = vpc.id;
export const vcp_name = config.vpc.name;
export const region = config.region;
export const vpc_cidr = config.vpc.cidr;

// Export subnet info for use of deployment targets
export const private_subnets = vpc.privateSubnetIds;
export const public_subnets = vpc.publicSubnetIds;

//#endregion

//#region Imports

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import { PulumiFn } from "@pulumi/pulumi/automation";

//#endregion

//#region Interfaces

/**
 * Holds the roles and role policies.
 *
 * @interface IRoles
 */
interface IRoles {
  ssmRole: aws.iam.Role;
  ssmCoreRoleAttachment: aws.iam.RolePolicyAttachment;
  ssmRoleEc2ContainerAttachment: aws.iam.RolePolicyAttachment;
  executionRole: aws.iam.Role;
  ecsTaskExecutionRoleAttachment: aws.iam.RolePolicyAttachment;
  taskRole: aws.iam.Role;
  taskRolePolicy: aws.iam.RolePolicy;
}

/**
 * Configuration object.
 *
 * @interface IConfig
 */
interface IConfig {
  region: string;
  environment: string;
  project: string;
  stack: string;
  numberNodes: number;
  costCenter: string;
  vpc_name: string;
  vpc_cidr: string;
  vpc_zone_count: number;
}

//#endregion

//#region Functions

/**
 * Gets the configuration object.
 *
 * @return {*}  {IConfig}
 */
let getConfig = (): IConfig => {
  const stack = pulumi.getStack();
  const project = pulumi.getProject();
  const awsConfig = new pulumi.Config("aws");
  const vpc = new pulumi.Config("vpc");

  // Build configuration parameters for entire deployment
  const config: IConfig = {
    region: awsConfig.require("region"),
    environment: stack,
    project: project,
    stack: stack,
    numberNodes: 2,
    costCenter: new pulumi.Config().get("costcenter") ?? "Core",
    vpc_name: project + "-" + stack,
    vpc_cidr: vpc.require<string>("cidr"),
    vpc_zone_count: vpc.requireNumber("zone_count"),
  };

  return config;
};

/**
 * Cretes the roles and role policies needed for the cluster.
 *
 * @return {*}  {IRoles}
 */
let setRoles = (): IRoles => {
  const ssmRole = new aws.iam.Role("ssmRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
      aws.iam.Principals.SsmPrincipal
    ),
  });

  const ssmCoreRoleAttachment = new aws.iam.RolePolicyAttachment(
    "rpa-ssmrole-ssminstancecore",
    {
      policyArn: aws.iam.ManagedPolicy.AmazonSSMManagedInstanceCore,
      role: ssmRole,
    }
  );

  const ssmRoleEc2ContainerAttachment = new aws.iam.RolePolicyAttachment(
    "rpa-ssmrole-ec2containerservice",
    {
      policyArn: aws.iam.ManagedPolicy.AmazonEC2ContainerServiceforEC2Role,
      role: ssmRole,
    }
  );

  const executionRole = new aws.iam.Role("taskExecutionRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
      aws.iam.Principals.EcsTasksPrincipal
    ),
  });

  const ecsTaskExecutionRoleAttachment = new aws.iam.RolePolicyAttachment(
    "rpa-ecsanywhere-ecstaskexecution",
    {
      role: executionRole,
      policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
    }
  );

  const taskRole = new aws.iam.Role("taskRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
      aws.iam.Principals.EcsTasksPrincipal
    ),
  });

  const taskRolePolicy = new aws.iam.RolePolicy("taskRolePolicy", {
    role: taskRole.id,
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "ssmmessages:CreateControlChannel",
            "ssmmessages:CreateDataChannel",
            "ssmmessages:OpenControlChannel",
            "ssmmessages:OpenDataChannel",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: ["logs:DescribeLogGroups"],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: [
            "logs:CreateLogStream",
            "logs:CreateLogGroup",
            "logs:DescribeLogStreams",
            "logs:PutLogEvents",
          ],
          Resource: "*",
        },
      ],
    },
  });

  const roles: IRoles = {
    ssmRole: ssmRole,
    ssmCoreRoleAttachment: ssmCoreRoleAttachment,
    ssmRoleEc2ContainerAttachment: ssmRoleEc2ContainerAttachment,
    executionRole: executionRole,
    ecsTaskExecutionRoleAttachment: ecsTaskExecutionRoleAttachment,
    taskRole: taskRole,
    taskRolePolicy: taskRolePolicy,
  };

  return roles;
};

//#endregion

const config = getConfig();
const vpc = new awsx.ec2.Vpc(config.vpc_name, {
  cidrBlock: config.vpc_cidr,
  numberOfAvailabilityZones: config.vpc_zone_count,
  numberOfNatGateways: 2,
  tags: {
    Name: `${config.vpc_name}`,
    CostCenter: `${config.costCenter}`,
    Stack: `pulumi:${config.project}/${config.stack}`,
  },
});
export const vpc_id = vpc.id;

// Set IAM roles
const roles = setRoles();

// Set up SSM
const ssmActivation = new aws.ssm.Activation("ecsanywhere-ssmactivation", {
  iamRole: roles.ssmRole.name,
  registrationLimit: config.numberNodes,
});

// Create cluster and export cluster name
const cluster = new aws.ecs.Cluster("cluster");
export const clusterName = cluster.name;
const logGroup = new aws.cloudwatch.LogGroup("logGroup");

// Create ECR repository and build and push docker image
const repo = new awsx.ecr.Repository("app");
const image = repo.buildAndPushImage("./app");

// Set up task definition
const taskDefinition = pulumi
  .all([image, logGroup.name, logGroup.namePrefix])
  .apply(
    ([img, logGroupName, nameprefix]) =>
      new aws.ecs.TaskDefinition("taskdefinition", {
        family: "ecs-anywhere",
        requiresCompatibilities: ["EXTERNAL"],
        taskRoleArn: roles.taskRole.arn,
        executionRoleArn: roles.executionRole.arn,
        containerDefinitions: JSON.stringify([
          {
            name: "app",
            image: img,
            cpu: 256,
            memory: 256,
            essential: true,
            portMappings: [
              {
                containerPort: 80,
                hostPort: 80,
              },
            ],
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-group": logGroupName,
                "awslogs-region": config.region,
                "awslogs-stream-prefixs": nameprefix,
              },
            },
          },
        ]),
      })
  );

// Deploy containers to droplets
const service = new aws.ecs.Service("service", {
  launchType: "EXTERNAL",
  taskDefinition: taskDefinition.arn,
  cluster: cluster.id,
  desiredCount: config.numberNodes - 1,
});

export const service_id = service.id;

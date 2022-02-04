import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const size = "t2.micro"; // t2.micro is available in the AWS free tier
const ami = pulumi.output(
  aws.getAmi({
    filters: [
      {
        name: "name",
        values: ["amzn-ami-hvm-*"],
      },
    ],
    owners: ["137112412989"], // This owner ID is Amazon
    mostRecent: true,
  })
);

const group = new aws.ec2.SecurityGroup("webserver-secgrp", {
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  ],
});

const server = new aws.ec2.Instance("webserver-www", {
  instanceType: size,
  vpcSecurityGroupIds: [group.id], // reference the security group resource above
  ami: ami.id,
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;

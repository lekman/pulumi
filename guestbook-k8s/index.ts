// index.ts

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";

const stackConfig = new pulumi.Config("stack");

// Connect stack reference to parent for VPC, see https://www.pulumi.com/docs/intro/concepts/stack/
const parentStack = new pulumi.StackReference(stackConfig.require("parent"));

// Get the kubeconfig from the parent stack output.
const kubeconfig = parentStack.getOutput("kubeconfig");

// Create the k8s provider with the kubeconfig.
const provider = new k8s.Provider("k8sProvider", { kubeconfig });

const name = "guestbook";

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace(name, {}, { provider: provider });

// Export the Namespace name
export const namespaceName = ns.metadata.name;

// Create a NGINX Deployment
const appLabels = { appClass: name };
const deployment = new k8s.apps.v1.Deployment(
  name,
  {
    metadata: {
      namespace: namespaceName,
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
    provider: provider,
  }
);

// Export the Deployment name
export const deploymentName = deployment.metadata.name;

// Create a LoadBalancer Service for the NGINX Deployment
const service = new k8s.core.v1.Service(
  name,
  {
    metadata: {
      labels: appLabels,
      namespace: namespaceName,
    },
    spec: {
      type: "LoadBalancer",
      ports: [{ port: 80, targetPort: "http" }],
      selector: appLabels,
    },
  },
  {
    provider: provider,
  }
);

// Export the Service name and public LoadBalancer Endpoint
export const serviceName = service.metadata.name;
export const serviceHostname = service.status.loadBalancer.ingress[0].hostname;

// Create resources for the Kubernetes Guestbook from its YAML manifests
const guestbook = new k8s.yaml.ConfigFile(
  "guestbook",
  {
    file: "https://raw.githubusercontent.com/pulumi/pulumi-kubernetes/master/tests/sdk/nodejs/examples/yaml-guestbook/yaml/guestbook.yaml",
    transformations: [
      (obj: any) => {
        // Do transformations on the YAML to use the same namespace and
        // labels as the NGINX stack above
        if (obj.metadata.labels) {
          obj.metadata.labels["appClass"] = namespaceName;
        } else {
          obj.metadata.labels = appLabels;
        }

        // Make the 'frontend' Service public by setting it to be of type
        // LoadBalancer
        if (obj.kind == "Service" && obj.metadata.name == "frontend") {
          if (obj.spec) {
            obj.spec.type = "LoadBalancer";
          }
        }
      },
    ],
  },
  {
    providers: { kubernetes: provider },
  }
);

// Export the Guestbook public LoadBalancer endpoint
export const guestbookPublicIP = guestbook
  .getResourceProperty("v1/Service", "frontend", "status")
  .apply((s) => s.loadBalancer.ingress[0].ip);

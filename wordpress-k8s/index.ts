import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// See https://www.pulumi.com/docs/intro/concepts/stack/
const env = pulumi.getStack();
const infra = new pulumi.StackReference(`lekman/k8s/${env}`); // Parent K8S stack
const provider = new k8s.Provider("k8s", {
  kubeconfig: infra.getOutput("kubeConfig"),
});
//const service = new k8s.core.v1.Service(..., { provider: provider });

console.log(infra.getOutput("kubeConfig"));

// Deploy the bitnami/wordpress chart.

const wordpress = new k8s.helm.v2.Chart("wpdev", {
  repo: "bitnami",
  version: "2.1.3",
  chart: "wordpress",
});
/*
const wordpress = new k8s.helm.v2.Chart("wpdev", {
  repo: "stable",
  version: "2.1.3",
  chart: "wordpress",
});
const wordpress = new k8s.helm.v3.Chart(
  "devopswiki-wp-dev",
  {
    version: "9.6.0",
    chart: "wordpress",
    fetchOpts: {
      repo: "https://charts.bitnami.com/bitnami",
    },
  },
  {
    providers: {
      kubernetes: provider,
    },
  }
);
*/

// Get the status field from the wordpress service, and then grab a reference to the ingress field.
const frontend = wordpress.getResourceProperty(
  "v1/Service",
  "wpdev-wordpress",
  "status"
);
const ingress = frontend.loadBalancer.ingress[0];

// Export the public IP for Wordpress.
// Depending on the k8s cluster, this value may be an IP address or a hostname.
export const frontendIp = ingress.apply((x) => x.ip ?? x.hostname);

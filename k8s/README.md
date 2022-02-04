# Kubernetes Infrastructure-as-Code Setup

### Table of contents

1. [Prerequisites](#prerequisites)
1. [Development](#development)
1. [Deployment](#deployment)

## Prerequisites

If Pulumi is already installed and can deploy to AWS, skip these steps. If not, install Pulumi:

```bash
brew install pulumi
```

If you are on Apple Silicon, then adjust (also in every **brew** command later on) as

```bash
arch --arm64 brew install pulumi
```

If you get version warnings, simply update Pulumi as:

```bash
brew upgrade pulumi
```

Verify installation:

```bash
$ pulumi version
v3.13.2
```

Esure you are logged in to Pulumi:

```bash
pulumi login
```

If not, follow instructions to authorize.

Then, use nvm to switch to latest stable LTS version of node.

```bash
$ brew install nvm
...
Type `nvm help` for further information.
==> Summary
🍺  /opt/homebrew/Cellar/nvm/0.38.0: 7 files, 176KB
Removing: /opt/homebrew/Cellar/nvm/0.37.2... (7 files, 171.2KB)

$ nvm ls-remote --lts
       ...
       v14.17.4   (LTS: Fermium)
       v14.17.5   (LTS: Fermium)
       v14.17.6   (LTS: Fermium)
       v14.18.0   (Latest LTS: Fermium)

$ nvm install v14.18.0
Downloading and installing node v14.18.0...
Downloading https://nodejs.org/dist/v14.18.0/node-v14.18.0-darwin-x64.tar.xz...
############################### 100.0%
Computing checksum with sha256sum
Checksums matched!
Now using node v14.18.0 (npm v6.14.15)

$ nvm use 14
```

[Connect AWS and Pulumi](https://www.pulumi.com/docs/get-started/aws/begin/) by:

1. Go to AWS IAM in the management console as ROOT
1. Create account (pulumi_svc) as access keys type and add to AdministratorsAccess group
1. Copy key/secret

The xCode tools intallation below takes a considerable time. Use the key/secret values after running the **aws configure** command.

```bash
xcode-select —install
brew install awscli
aws configure
touch ~/.aws/credentials; open ~/.aws/credentials
```

You should see the AWS configuration file. Verify and close TextEdit

## Development

Add the k8s packages. Already done in the saved project.

```bash
npm install --save @pulumi/eks @pulumi/kubernetes
```

## Deployment

Note that the creation takes up to 15 minutes. Run these commands from the project folder (this folder) in terminal:

```bash
$ pulumi stack init dev
Created stack 'dev'
$ pulumi stack select dev

...
added 122 packages from 203 contributors and audited 123 packages in 9.289s

31 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

$ pulumi up --skip-preview
Updating (dev)

View Live: https://app.pulumi.com/lekman/k8s/dev/updates/5

     Type                                    Name                                         Status
 +   pulumi:pulumi:Stack                     k8s-dev                                      creating.
 +   ├─ awsx:x:ec2:Vpc                       devops-k8s-vpc-dev                           created
 ...
 +   │  ├─ awsx:x:ec2:InternetGateway
 +   ├─ kubernetes:core/v1:Namespace                  devops-k8s-ns-dev                                 created
 +   ├─ kubernetes:core/v1:Service                    devops-k8s-svc-dev                                created
 +   └─ kubernetes:apps/v1:Deployment                 devops-k8s-deploy-dev                             created

Diagnostics:
  pulumi:pulumi:Stack (k8s-dev):
    Warning: apiextensions.k8s.io/v1beta1 CustomResourceDefinition is deprecated in v1.16+, unavailable in v1.22+; use apiextensions.k8s.io/v1 CustomResourceDefinition

Outputs:
    deploymentName : "devops-k8s-deploy-dev-9oj8eyjj"
    kubeconfig     : {
        ...
    }
    namespaceName  : "devops-k8s-ns-dev-hd6zlq5i"
    serviceHostname: "a6a1e681309a04d4eaaa2b54389a92ba-1968050789.eu-west-2.elb.amazonaws.com"
    serviceName    : "devops-k8s-svc-dev-u0clh92r"

Resources:
    + 46 created

Duration: 12m38s
```

Install AWS IAM authenticator and [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-macos/) and configure cluster config:

```bash
brew install aws-iam-authenticator
aws-iam-authenticator help
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/arm64/kubectl"
kubectl version
pulumi stack output kubeconfig > kubeconfig
export KUBECONFIG=`pwd`/kubeconfig
sudo curl -s -o /usr/local/bin/kubectl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/arm64/kubectl"
sudo chmod +x /usr/local/bin/kubectl
kubectl version
kubectl cluster-info
kubectl get nodes
```

Copy the kubeconfig file to any other project that needs to deploy to the cluster.

To remove the cluster if no longer needed, use

```bash
pulumi destroy --skip-preview --yes
```

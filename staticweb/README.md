# Static Web on S2 Bucket Infrastructure-as-Code Setup

Based on Pulumi example: [AWS TS Static Website](https://github.com/pulumi/examples/tree/master/aws-ts-static-website).

### Table of contents

1. [Prerequisites](#prerequisites)
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

You should see the AWS configuration file. Verify and close TextEdit.

## Deployment

Move to the repo folder and run:

```bash
$ pulumi stack init dev
Created stack 'dev'
$ pulumi stack select dev

$ npm install
...
added 122 packages from 203 contributors and audited 123 packages in 9.289s

31 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

$ pulumi stack select dev
$ pulumi up --skip-preview
Updating (dev)

View Live: https://app.pulumi.com/lekman/staticweb/dev/updates/1

     Type                 Name                  Status
 +   pulumi:pulumi:Stack  staticweb-dev         created
 +   ├─ aws:s3:Bucket     staticweb-log-bucket  created
 +   ├─ aws:kms:Key       staticweb-bucket-key  created
 +   └─ aws:s3:Bucket     staticweb-bucket      created

Outputs:
    bucketId: "staticweb-bucket-d0880a0"

Resources:
    + 4 created

Duration: 11s
```

To remove the site if no longer needed, use

```bash
pulumi destroy --skip-preview --yes
```

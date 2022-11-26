# Pulumi

## Windows Quick Start

```bash
chocolately install pulumi
```

Restart VSCode

Authenticate AWS

```bash
$env:AWS_ACCESS_KEY_ID = "<YOUR_ACCESS_KEY_ID>"
$env:AWS_SECRET_ACCESS_KEY = "<YOUR_SECRET_ACCESS_KEY>"
```

```bash
pulumi login
cd ./stack-folder-name
pulumi stack ls
pulumi stack select [stackname]
pulumi preview
pulumi up
```

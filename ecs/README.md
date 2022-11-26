# ECS Anywhere

Note: Docker must be running for this install to work. The Docker engine should run in Linux container mode.

If Docker is not running then you may see the following error:

    error: error during connect: In the default daemon
    configuration on Windows, the docker client must be
    run with elevated privileges to connect.

Prepare the app folder:

```bash
cd ./app
nmp install
```

You can then run _pulumi preview_.

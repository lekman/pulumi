# Guestbook app in Kubernetes

Based on [ECS for Kubernetes (EKS) - Hello World!](https://www.pulumi.com/registry/packages/kubernetes/how-to-guides/eks/)

Requires:

- [VPC stack](./vpc)
- [Kubernetes EKS stack](./k8s)

Be sure to follow ./k8s and copy kubeconfig to /usr/bin

Create stack, then update the config.yaml file, as it must contain the name of the parent stack, for example

```yaml
config:
  aws:region: eu-west-2
  stack:parent: lekman/k8s/london
```

Then run **pulumi up**.

Once completed:

```console
kubectl get services

NAME           TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)        AGE
frontend       LoadBalancer   172.20.157.83    a9932e7c50b8d4faba96815ab86bdf35-1690422037.eu-west-2.elb.amazonaws.com   80:32438/TCP   14m
kubernetes     ClusterIP      172.20.0.1       <none>                                                                    443/TCP        163m
redis-master   ClusterIP      172.20.143.106   <none>                                                                    6379/TCP       14m
redis-slave    ClusterIP      172.20.134.167   <none>                                                                    6379/TCP       14m

```

Navigate to guestbook, for example: [a9932e7c50b8d4faba96815ab86bdf35-1690422037.eu-west-2.elb.amazonaws.com](a9932e7c50b8d4faba96815ab86bdf35-1690422037.eu-west-2.elb.amazonaws.com)

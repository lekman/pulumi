workspace "Astra Zeneca - BOOST - API Gateway" "System landscape for the API Gateway implementation" {

    !identifiers hierarchical
    
    model {

        customer = person "Customer" "Access information from the system" "Person"
        editor = person "Content Editor" "Previews content changes" "Person"
        
        dmdp = softwareSystem "DMDP" "Cloud-hosted micro-services." "Software System" {
            cmspod = container "Content Delivery Services Pod" "Micro-services API hosted in Kubernetes." "NGINX Ingress" "Container" {
                health = component "Health Check" "Respond to ping" "Container"
            }
            userpod = container "User Pod" "Micro-services API hosted in Kubernetes." "NGINX Ingress" "Container" {
                health = component "Health Check" "Respond to ping" "Container"
            }
            agent = container "Hosted Agent" "Pipeline agent deployed within AWS VPC." "" "Container"
            s3 = container "S3 bucket" "Hosts CMS content" "" "Container"
            gateway = container "Gateway" "Redirects and secures traffic" "" "Container"
            gateway -> userpod "Authorize" "HTTPS"
            gateway -> s3 "Forward request to" "HTTPS"
            gateway -> cmspod "Forward request to" "HTTPS"
        }
        
        devops = softwareSystem "DevOps" "SaaS system for CI/CD pipelines." "Software System" {
            pipeline = container "Pipeline" "Execute CI/CD pipeline and approval gates." "Container"
        }
        
        contentStack = softwareSystem "Contentstack" "SaaS CMS platform." "Software System" {
            cmsapi = container "Content Management Service API" "" "Container"
            cdnapi = container "Content Delivery API" "" "Container"
            imgapi = container "Image Delivery API" "" "Container"
            assetapi = container "Assets API" "" "Container"
        }
        
        # Define relationships between people, systems and components
        customer -> dmdp.gateway "Access information" "HTTPS"
        editor -> dmdp.gateway "Access preview information" "HTTPS"
        dmdp.cmspod -> contentStack.cmsapi "Access data" "HTTPS"
        dmdp.cmspod -> contentStack.cdnapi "Access data" "HTTPS"
        dmdp.cmspod -> contentStack.imgapi "Access data" "HTTPS"
        dmdp.cmspod -> contentStack.assetapi "Access data" "HTTPS"
        dmdp.agent -> devops.pipeline "Trigger" "Private link"
        dmdp.agent -> dmdp.cmspod "Provision"

        # Define box deployment
        box = deploymentEnvironment "Box" {
        
            internet = deploymentNode "Internet" {
                clients = infrastructureNode "Clients"
            }
            
            az = deploymentNode "AstraZeneca" {
                editors = infrastructureNode "Content Editors"
            }
            
            devOpsNode = deploymentNode "Azure DevOps" "" "" "Microsoft Azure - Azure DevOps" {
                pipe = containerInstance devops.pipeline
            }
            
            aws = deploymentNode "Amazon Web Services" "" "" "Amazon Web Services - Cloud" {
                region = deploymentNode "EU-West-1" "" "" "Amazon Web Services - Region" {
                    route53 = infrastructureNode "Route 53" "" "" "Amazon Web Services - Route 53"
                    apig = infrastructureNode "API Gateway" "" "" "Amazon Web Services - API Gateway"
                    route53 -> apig "Forwards request to" "HTTPS"
                    
                    vpclink = infrastructureNode "VPC Link" "" "" "Amazon Web Services - VPC Endpoints"
                    apig -> vpcLink "Forwards request to" "HTTPS"

                    vpc = deploymentNode "VPC (Prod)" "" "" "Amazon Web Services - VPC" {
                        alb = infrastructureNode "ALB" "AWS Application Load Balancer" "" "Amazon Web Services - Elastic Load Balancing ELB Application load balancer"
                        vpcLink -> alb "Forwards request to" "HTTPS"
                        
                        eks = deploymentNode "Amazon EKS" "" "" "Amazon Web Services - Elastic Kubernetes Service" {
                            az1 = deploymentNode "Availability Zone 1" "" "" "Amazon Web Services - VPC subnet public" {
                                cmsPodInstance = containerInstance dmdp.cmspod
                                
                            }
                            az2 = deploymentNode "Availability Zone 2" "" "" "Amazon Web Services - VPC subnet public" {
                                userPodInstance = containerInstance dmdp.userpod
                                
                            }
                            alb -> az1.cmsPodInstance "Forwards requests to" "HTTPS"
                            alb -> az1.cmsPodInstance "Ping" "HTTPS"
                        }
                    }
                    
                    vpcDev = deploymentNode "VPC (Dev)" "" "" "Amazon Web Services - VPC" {
                        eks = deploymentNode "Amazon EKS" "" "" "Amazon Web Services - Elastic Kubernetes Service" {
                            az1 = deploymentNode "Availability Zone 1" "" "" "Amazon Web Services - VPC subnet public" {
                                agentInstance = containerInstance dmdp.agent
                            }
                        }
                    }
                    
                    waf = infrastructureNode "AWS WAF" "Firewall rules, IWASP" "" "Amazon Web Services - WAF"
                    apig -> waf "Process"
                    
                    edge = infrastructureNode "CloudFront Edge" "Edge node cache" "" "Amazon Web Services - CloudFront Edge Location"
                    route53 -> edge "Forwards request to" "HTTPS"
                    edge -> apig "Forwards request to" "HTTPS"
                    
                    lambda_auth = infrastructureNode "Lambda Authenticator" "Authenticate JWT token" "" "Amazon Web Services - Lambda Lambda Function"
                    apig -> lambda_auth "Authenticates" "HTTPS"
                    
                    lambda_func = infrastructureNode "Lambda Function" "Route request by setting backend URL" "" "Amazon Web Services - Lambda Lambda Function"
                    apig -> lambda_func "Forwards request" "HTTPS"
                    
                    cmsbucket = infrastructureNode "S3 Bucket" "" "" "Amazon Web Services - Simple Storage Service S3 Bucket"
                    lambda_func -> cmsbucket "Forward request"
                    
                    lambda_auth -> vpc.eks.az2.userPodInstance "Authorize" "HTTPS"
                    # lambda_auth -> cognito "Authenticates" "HTTPS"
                    
                    cloudwatch = infrastructureNode "CloudWatch" "" "" "Amazon Web Services - CloudWatch"
                    vpc.eks.az1.cmsPodInstance -> cloudwatch "Audit"
                    
                    secrets = infrastructureNode "Secrets Manager" "" "" "Amazon Web Services - Secrets Manager"
                    vpcDev.eks.az1.agentInstance -> secrets "Read secrets"
                    
                    vpc.eks.az1.cmsPodInstance -> cmsbucket "Stores data" "HTTPS"
                }
            }
            
            internet.clients -> aws.region.route53 "Requests data" "HTTPS"
            internet.clients -> aws.region.edge "Requests data" "HTTPS"
            az.editors -> aws.region.route53 "Requests data" "HTTPS"
            
            cstack = deploymentNode "Contentstack" "" "" "" {
                incms = containerInstance contentStack.cmsapi
                incdn = containerInstance contentStack.cdnapi
                inimg = containerInstance contentStack.imgapi
                inass = containerInstance contentStack.assetapi
            }
        }
    }

    views {

        systemContext dmdp "SystemContext" "System context for the DMDP deployment" {
            include *
            autolayout
        }
        
        container dmdp {
            include *
            autolayout
        }
        
        deployment dmdp "Box" "AWS_Deployment" "DMDP Box deployment in AWS" {
            include dmdp box.aws box.internet box.az contentStack box.cstack box.cstack.incms box.cstack.incdn box.cstack.inimg box.cstack.inass devops.pipeline
        }

        styles { 
        
            element "Person" {
                shape Person
                color #ffffff
                background #2D547A
            }
            
            element "Software System" {
                background #3186F4
                color #ffffff
            }
            
            element "Container" {
                background #3186F4
                color #ffffff
                shape RoundedBox
            }
        }
        
        themes https://static.structurizr.com/themes/amazon-web-services-2020.04.30/theme.json
        themes https://static.structurizr.com/themes/microsoft-azure-2021.01.26/theme.json
    }
}

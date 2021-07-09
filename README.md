# AWS Tree Exporter

Visualise the network setup of an AWS account from the command line.

## How to run with Docker

The following script will invoke the latest version of aws-tree using the supplied `PROFILE` and `REGION` environment variables.

```bash
export PROFILE=...
export REGION=...

docker run \
  --rm -it \
  -v "${HOME}/.aws/credentials:/root/.aws/credentials:ro" \
  -e AWS_PROFILE=${PROFILE} \
  -e AWS_REGION=${REGION} \
  alexswilliams/aws-tree:latest
```

If you have this respository already checked out, you can run the following:

```bash
./run.sh ${PROFILE} ${REGION}
```

## Output Content

The output currently displays VPCs, subnets within them, and ENIs within those subnets, as well as some supporting furniture such as gateways, route tables and endpoints.

For example:

```
╒══════════════════════════════════════
│ vpc-xxxxxxx (MyAccountsFirstVPC)
│  • 10.0.0.0/24
│╲
│ │ rtb-xxxxxxx [VPC Default]
│ │  • 10.0.0.0/24 via local - active
│╲
│ │ igw-xxxxxxx (SomeInternetGateway)
│
│╲
│ │ subnet-xxxxxxx (Subnet1)
│ │   AZ: eu-west-1b
│ │   CIDR: 10.0.0.112/28 (11 available IPs)
│ │╲
│ │ │ rtb-xxxxxxx (Subnet1RouteTable)
│ │ │  • 10.0.0.0/24 via local - active
│ │╲
│ │ │ acl-xxxxxxx [VPC Default]
│ │ │   Ingress:
│ │ │     •   100: ALLOW from 0.0.0.0/0 to any ports
│ │ │     • 32767: DENY from 0.0.0.0/0 to any ports
│ │ │   Egress:
│ │ │     •   100: ALLOW to 0.0.0.0/0 on any ports
│ │ │     • 32767: DENY to 0.0.0.0/0 on any ports
│ │╲
│ │ │ vpce-xxxxxxx (Interface: com.amazonaws.eu-west-1.ecr.api) - available
│ │ │   Private DNS enabled: true
│ │ │ ┐ eni-xxxxxxx (VPC Endpoint Interface vpce-xxxxxxx)
│ │ │ │   • 10.0.0.85
│ │ │ │ ┐ sg-xxxxxxx(FargateSecurityGroup)
│ │ │ │ │   Ingress: ALLOW from [sg-xxxxxxx] to 443
│ │ │ │ │   Egress: DENY to [any address] to any ports
...
```

import { AWSError, EC2, ECS, ELBv2, RDS, Request } from 'aws-sdk'

const ec2Api = new EC2()
const ecsApi = new ECS()
const elbApi = new ELBv2()
const rdsApi = new RDS()

async function allPages<Res>(
  firstPageRequest: Request<Res, AWSError>,
  combinator: (acc: Res, next: Res) => Res
): Promise<Res | AWSError> {
  const responses = []
  let request = firstPageRequest
  let response
  do {
    response = await request.promise()
    if (response.$response.error) return response.$response.error
    if (!response.$response.data) throw Error('data missing, no error given')
    responses.push(response.$response.data)

    if (!request.isPageable()) break

    const nextPage = response.$response.nextPage()
    if (nextPage === undefined) break
    request = nextPage
  } while (response.$response.hasNextPage())

  return responses.reduce(combinator)
}

async function allPagesThrowing<Res>(
  firstPageRequest: Request<Res, AWSError>,
  combinator: (acc: Res, next: Res) => Res
): Promise<Res> {
  const result = await allPages(firstPageRequest, combinator)
  if (result instanceof Error) throw Error
  return result
}

export type AllResources = {
  vpcs: VpcModel[]
  subnets: SubnetModel[]
  enis: EniModel[]
  nacls: NaclModel[]
  secGroups: SecGroupModel[]
  vpcPeerings: VpcPeeringModel[]
  intGws: InternetGatewayModel[]
  natGws: NatGatewayModel[]
  routeTables: RouteTableModel[]
  vpcEndpoints: VpcEndpointModel[]
  ecsTasks: EcsTaskModel[]
  loadBalancers: LoadBalancerModel[]
  rds: RdsModel[]
}
export async function getAllResources(mock?: AllResources): Promise<AllResources> {
  if (mock) return mock

  const [vpcs, subnets, enis, nacls, secGroups, vpcPeerings, intGws, natGws, routeTables, vpcEndpoints] =
    await Promise.all([
      getAllVpcs(),
      getAllSubnets(),
      getAllEnis(),
      getAllNacls(),
      getAllSecurityGroups(),
      getAllVpcPeerings(),
      getAllInternetGateways(),
      getAllNatGateways(),
      getAllRouteTables(),
      getAllVpcEndpoints(),
    ])
  const [ecsTasks, loadBalancers, rds] = await Promise.all([
    getAllEcsTasks(),
    getAllLoadBalancers(enis),
    getAllRdsInstances(enis),
  ])

  const allResources = {
    vpcs,
    subnets,
    enis,
    nacls,
    secGroups,
    vpcPeerings,
    intGws,
    natGws,
    routeTables,
    vpcEndpoints,
    ecsTasks,
    loadBalancers,
    rds,
  }
  return allResources
}

//
// Individual API calls
//

export type VpcModel = {
  id: string
  name: string | undefined
  v4Cidrs: string[]
  accountId: string
}
export async function getAllVpcs(): Promise<VpcModel[]> {
  const vpcResponse = await allPagesThrowing(ec2Api.describeVpcs(), (acc, next) => ({
    Vpcs: [...(acc.Vpcs ?? []), ...(next.Vpcs ?? [])],
  }))
  return (
    vpcResponse.Vpcs?.map(vpc => ({
      id: vpc.VpcId ?? 'unknown-vpc',
      name: vpc.Tags?.find(it => it.Key == 'Name')?.Value,
      v4Cidrs: vpc.CidrBlockAssociationSet?.map(it => it.CidrBlock ?? '?cidrv4') ?? [vpc.CidrBlock ?? 'cidrv4'],
      accountId: vpc.OwnerId ?? '?account',
    })) ?? []
  )
}

export type SubnetModel = {
  id: string
  name: string | undefined
  vpcId: string
  az: string
  v4Cidr: string
  availableIps: number
}
export async function getAllSubnets(): Promise<SubnetModel[]> {
  const subnetsResponse = await allPagesThrowing(ec2Api.describeSubnets(), (acc, next) => ({
    Subnets: [...(acc.Subnets ?? []), ...(next.Subnets ?? [])],
  }))
  return (
    subnetsResponse.Subnets?.map(subnet => ({
      id: subnet.SubnetId ?? 'unknown-subnet',
      name: subnet.Tags?.find(it => it.Key == 'Name')?.Value,
      vpcId: subnet.VpcId ?? '?vpc',
      az: subnet.AvailabilityZone ?? '?az',
      v4Cidr: subnet.CidrBlock ?? 'cidrv4',
      availableIps: subnet.AvailableIpAddressCount ?? 0,
    })) ?? []
  )
}

export type EniModel = {
  id: string
  description: string | undefined
  subnetId: string
  ips: {
    private: string
    public: string | undefined
    ownedBy: string | undefined
  }[]
  secGroups: string[]
}
export async function getAllEnis(): Promise<EniModel[]> {
  const enisResponse = await allPagesThrowing(ec2Api.describeNetworkInterfaces(), (acc, next) => ({
    NetworkInterfaces: [...(acc.NetworkInterfaces ?? []), ...(next.NetworkInterfaces ?? [])],
  }))
  return (
    enisResponse.NetworkInterfaces?.map(eni => ({
      id: eni.NetworkInterfaceId ?? 'unknown-eni',
      description: eni.Description,
      subnetId: eni.SubnetId ?? '?subnet',
      ips:
        eni.PrivateIpAddresses?.map(it => ({
          private: it.PrivateIpAddress ?? '?ipv4',
          public: it.Association?.PublicIp,
          ownedBy: it.Association?.IpOwnerId,
        })) ?? [],
      secGroups: eni.Groups?.map(it => it.GroupId ?? '?secgroup') ?? [],
    })) ?? []
  )
}

export type NaclModel = {
  id: string
  vpcId: string
  logicalId: string | undefined
  associatedSubnets: string[]
  isDefault: boolean
  ingress: {
    ruleNumber: number
    from: string
    destPorts: string | undefined
    action: string
  }[]
  egress: {
    ruleNumber: number
    to: string
    destPorts: string | undefined
    action: string
  }[]
}
export async function getAllNacls(): Promise<NaclModel[]> {
  const naclsResponse = await allPagesThrowing(ec2Api.describeNetworkAcls(), (acc, next) => ({
    NetworkAcls: [...(acc.NetworkAcls ?? []), ...(next.NetworkAcls ?? [])],
  }))
  return (
    naclsResponse.NetworkAcls?.map(nacl => ({
      id: nacl.NetworkAclId ?? 'unknown-nacl',
      vpcId: nacl.VpcId ?? 'unknown-vpc',
      logicalId: nacl.Tags?.find(it => it.Key == 'aws:cloudformation:logical-id')?.Value,
      associatedSubnets: nacl.Associations?.map(ass => ass.SubnetId ?? '?subnet') ?? [],
      isDefault: nacl.IsDefault ?? false,
      ingress:
        nacl.Entries?.filter(it => it.Egress != true)?.map(it => ({
          ruleNumber: it.RuleNumber ?? -1,
          from: [it.CidrBlock ?? '', it.Ipv6CidrBlock ?? ''].filter(it => it != '').join(','),
          destPorts:
            it.PortRange?.To == it.PortRange?.From
              ? it.PortRange?.From?.toString()
              : `${it.PortRange?.From}-${it.PortRange?.To}`,
          action: it.RuleAction ?? '?action',
        })) ?? [],
      egress:
        nacl.Entries?.filter(it => it.Egress == true)?.map(it => ({
          ruleNumber: it.RuleNumber ?? -1,
          to: [it.CidrBlock ?? '', it.Ipv6CidrBlock ?? ''].filter(it => it != '').join(','),
          destPorts:
            it.PortRange?.To == it.PortRange?.From
              ? it.PortRange?.From?.toString()
              : `${it.PortRange?.From}-${it.PortRange?.To}`,
          action: it.RuleAction ?? '?action',
        })) ?? [],
    })) ?? []
  )
}

export type SecGroupModel = {
  id: string
  vpcId: string
  name: string | undefined
  description: string | undefined
  ingress: {
    port: string
    from: string[]
  }[]
  egress: {
    port: string
    to: string[]
  }[]
}
export async function getAllSecurityGroups(): Promise<SecGroupModel[]> {
  const sgResponse = await allPagesThrowing(ec2Api.describeSecurityGroups(), (acc, next) => ({
    SecurityGroups: [...(acc.SecurityGroups ?? []), ...(next.SecurityGroups ?? [])],
  }))
  return (
    sgResponse.SecurityGroups?.map(sg => ({
      id: sg.GroupId ?? 'unknown-sec-group',
      vpcId: sg.VpcId ?? 'unknown-vpc',
      name: sg.GroupName,
      description: sg.Description,
      ingress:
        sg.IpPermissions?.map(rule => ({
          port: rule.FromPort == rule.ToPort ? rule.FromPort?.toString() ?? '-1' : `${rule.FromPort}-${rule.ToPort}`,
          from: [
            ...(rule.IpRanges?.map(ip => ip.CidrIp ?? '?v4cidr') ?? []),
            ...(rule.Ipv6Ranges?.map(ip => ip.CidrIpv6 ?? '?v6cidr') ?? []),
            ...(rule.PrefixListIds?.map(list => list.PrefixListId ?? '?prefixlist') ?? []),
            ...(rule.UserIdGroupPairs?.map(sg => sg.GroupId ?? '?secgroup') ?? []),
          ],
        })) ?? [],
      egress:
        sg.IpPermissionsEgress?.map(rule => ({
          port: rule.FromPort == rule.ToPort ? rule.FromPort?.toString() ?? '-1' : `${rule.FromPort}-${rule.ToPort}`,
          to: [
            ...(rule.IpRanges?.map(ip => ip.CidrIp ?? '?v4cidr') ?? []),
            ...(rule.Ipv6Ranges?.map(ip => ip.CidrIpv6 ?? '?v6cidr') ?? []),
            ...(rule.PrefixListIds?.map(list => list.PrefixListId ?? '?prefixlist') ?? []),
            ...(rule.UserIdGroupPairs?.map(sg => sg.GroupId ?? '?secgroup') ?? []),
          ],
        })) ?? [],
    })) ?? []
  )
}

export type VpcPeeringModel = {
  id: string
  name: string | undefined
  logicalId: string | undefined
  status: string
  requester: {
    cidrs: string[]
    vpcId: string
    account: string
  }
  accepter: {
    cidrs: string[]
    vpcId: string
    account: string
  }
}
export async function getAllVpcPeerings(): Promise<VpcPeeringModel[]> {
  const vpcPeeringResponse = await allPagesThrowing(ec2Api.describeVpcPeeringConnections(), (acc, next) => ({
    VpcPeeringConnections: [...(acc.VpcPeeringConnections ?? []), ...(next.VpcPeeringConnections ?? [])],
  }))
  return (
    vpcPeeringResponse.VpcPeeringConnections?.map(pcx => ({
      id: pcx.VpcPeeringConnectionId ?? 'unknown-vpc-peering',
      name: pcx.Tags?.find(it => it.Key == 'Name')?.Value,
      logicalId: pcx.Tags?.find(it => it.Key == 'aws:cloudformation:logical-id')?.Value,
      status: pcx.Status?.Code ?? 'unknown',
      requester: {
        cidrs: [
          ...(pcx.RequesterVpcInfo?.CidrBlockSet?.map(it => it.CidrBlock ?? '?cidrv4') ?? []),
          ...(pcx.RequesterVpcInfo?.Ipv6CidrBlockSet?.map(it => it.Ipv6CidrBlock ?? '?cidrv6') ?? []),
        ],
        vpcId: pcx.RequesterVpcInfo?.VpcId ?? '?vpcid',
        account: pcx.RequesterVpcInfo?.OwnerId ?? '?account',
      },
      accepter: {
        cidrs: [
          ...(pcx.AccepterVpcInfo?.CidrBlockSet?.map(it => it.CidrBlock ?? '?cidrv4') ?? []),
          ...(pcx.AccepterVpcInfo?.Ipv6CidrBlockSet?.map(it => it.Ipv6CidrBlock ?? '?cidrv6') ?? []),
        ],
        vpcId: pcx.AccepterVpcInfo?.VpcId ?? '?vpcid',
        account: pcx.AccepterVpcInfo?.OwnerId ?? '?account',
      },
    })) ?? []
  )
}

export type InternetGatewayModel = {
  id: string
  name: string | undefined
  vpcIds: string[]
}
export async function getAllInternetGateways(): Promise<InternetGatewayModel[]> {
  const response = await allPagesThrowing(ec2Api.describeInternetGateways(), (acc, next) => ({
    InternetGateways: [...(acc.InternetGateways ?? []), ...(next.InternetGateways ?? [])],
  }))
  return (
    response.InternetGateways?.map(igw => ({
      id: igw.InternetGatewayId ?? 'unknown-igw',
      name: igw.Tags?.find(it => it.Key == 'Name')?.Value,
      vpcIds: igw.Attachments?.filter(it => it.State == 'available')?.map(it => it.VpcId ?? '?vpc') ?? [],
    })) ?? []
  )
}

export type NatGatewayModel = {
  id: string
  name: string | undefined
  subnetId: string
  enis: {
    eni: string
    privateIp: string
    publicIp: string
  }[]
}
export async function getAllNatGateways(): Promise<NatGatewayModel[]> {
  const response = await allPagesThrowing(ec2Api.describeNatGateways(), (acc, next) => ({
    NatGateways: [...(acc.NatGateways ?? []), ...(next.NatGateways ?? [])],
  }))
  return (
    response.NatGateways?.map(natgw => ({
      id: natgw.NatGatewayId ?? 'unknown-nat-gw',
      name: natgw.Tags?.find(it => it.Key == 'Name')?.Value,
      subnetId: natgw.SubnetId ?? '?subnet',
      enis:
        natgw.NatGatewayAddresses?.map(it => ({
          eni: it.NetworkInterfaceId ?? '?eni',
          privateIp: it.PrivateIp ?? '?ipv4',
          publicIp: it.PublicIp ?? '?ipv4',
        })) ?? [],
    })) ?? []
  )
}

export type RouteTableModel = {
  id: string
  name: string | undefined
  isMain: boolean
  vpcId: string
  subnetAssociations: string[]
  routes: {
    destination: string
    via: string
    state: string
  }[]
}
export async function getAllRouteTables(): Promise<RouteTableModel[]> {
  const response = await allPagesThrowing(ec2Api.describeRouteTables(), (acc, next) => ({
    RouteTables: [...(acc.RouteTables ?? []), ...(next.RouteTables ?? [])],
  }))
  return (
    response.RouteTables?.map(table => ({
      id: table.RouteTableId ?? 'unknown-route-table',
      name: table.Tags?.find(it => it.Key == 'Name')?.Value,
      isMain: table.Associations?.some(it => it.Main == true) ?? false,
      vpcId: table.VpcId ?? '?vpc',
      subnetAssociations:
        table.Associations?.filter(it => it.Main != true && it.AssociationState?.State == 'associated')?.map(
          it => it.SubnetId ?? '?subnet'
        ) ?? [],
      routes:
        table.Routes?.map(route => ({
          destination:
            route.DestinationCidrBlock ?? route.DestinationIpv6CidrBlock ?? route.DestinationPrefixListId ?? 'unknown',
          via:
            route.GatewayId ??
            route.LocalGatewayId ??
            route.NatGatewayId ??
            route.NetworkInterfaceId ??
            route.TransitGatewayId ??
            route.VpcPeeringConnectionId ??
            'unknown',
          state: route.State ?? 'unknown',
        })) ?? [],
    })) ?? []
  )
}

export type VpcEndpointModel = {
  id: string
  type: string
  service: string
  vpcId: string
  state: string
  privateDns: boolean
  enis: string[]
}
export async function getAllVpcEndpoints(): Promise<VpcEndpointModel[]> {
  const response = await allPagesThrowing(ec2Api.describeVpcEndpoints(), (acc, next) => ({
    VpcEndpoints: [...(acc.VpcEndpoints ?? []), ...(next.VpcEndpoints ?? [])],
  }))
  return (
    response.VpcEndpoints?.map(endpoint => ({
      id: endpoint.VpcEndpointId ?? 'unknown-vpc-endpoint',
      type: endpoint.VpcEndpointType ?? 'unknown',
      service: endpoint.ServiceName ?? 'unknown',
      vpcId: endpoint.VpcId ?? '?vpc',
      state: endpoint.State ?? 'unknown',
      privateDns: endpoint.PrivateDnsEnabled ?? false,
      enis: endpoint.NetworkInterfaceIds ?? [],
    })) ?? []
  )
}

export type EcsTaskModel = {
  arn: string
  connectivity: string
  subnetIds: string[]
  enis: string[]
  containers: {
    arn: string
    name: string | undefined
    status: string
    health: string
    enis: string[]
  }[]
}
export async function getAllEcsTasks(): Promise<EcsTaskModel[]> {
  const clusterArns =
    (
      await allPagesThrowing(ecsApi.listClusters(), (acc, next) => ({
        clusterArns: [...(acc.clusterArns ?? []), ...(next.clusterArns ?? [])],
      }))
    ).clusterArns ?? []

  const taskDescriptionsPerCluster = await Promise.all(
    clusterArns.map(async clusterArn => {
      const taskArnResponse = await allPagesThrowing(ecsApi.listTasks({ cluster: clusterArn }), (acc, next) => ({
        taskArns: [...(acc.taskArns ?? []), ...(next.taskArns ?? [])],
      }))

      if ((taskArnResponse.taskArns ?? []).length == 0) return []

      const response = await allPagesThrowing(
        ecsApi.describeTasks({
          tasks: taskArnResponse.taskArns ?? [],
          cluster: clusterArn,
        }),
        (acc, next) => ({
          tasks: [...(acc.tasks ?? []), ...(next.tasks ?? [])],
        })
      )

      return response.tasks ?? []
    })
  )
  const allTasks = taskDescriptionsPerCluster.flat(1)

  return allTasks.map(task => ({
    arn: task.taskArn ?? 'unknown-task',
    connectivity: task.connectivity ?? 'unknown',
    subnetIds: [
      ...new Set(
        task.attachments?.map(it => it.details?.find(detail => detail.name == 'subnetId')?.value ?? 'unknown-subnet')
      ),
    ],
    enis: [
      ...new Set(
        task.attachments?.map(
          it => it.details?.find(detail => detail.name == 'networkInterfaceId')?.value ?? 'unknown-eni'
        )
      ),
    ],
    containers:
      task.containers?.map(cont => ({
        arn: cont.containerArn ?? 'unknown-container',
        name: cont.name,
        status: cont.lastStatus ?? 'UNKNOWN',
        health: cont.healthStatus ?? 'UNKNOWN',
        enis:
          cont.networkInterfaces?.map(
            nif =>
              task.attachments
                ?.find(att => att.id == nif.attachmentId)
                ?.details?.find(it => it.name == 'networkInterfaceId')?.value ?? '?eni'
          ) ?? [],
      })) ?? [],
  }))
}

export type LoadBalancerModel = {
  arn: string
  name: string
  type: string
  vpcId: string
  enis: string[]
  subnets: string[]
}
export async function getAllLoadBalancers(enis: EniModel[]): Promise<LoadBalancerModel[]> {
  const response = await allPagesThrowing(elbApi.describeLoadBalancers(), (acc, next) => ({
    LoadBalancers: [...(acc.LoadBalancers ?? []), ...(next.LoadBalancers ?? [])],
  }))
  return (
    response.LoadBalancers?.map(lb => ({
      arn: lb.LoadBalancerArn ?? 'unknown-load-balancer',
      name: lb.LoadBalancerName ?? 'unknown-load-balancer',
      type: lb.Type ?? 'unknown',
      vpcId: lb.VpcId ?? '?vpc',
      enis: enis.filter(it => it.description?.includes(lb.LoadBalancerName ?? ' ')).map(it => it.id),
      subnets: enis.filter(it => it.description?.includes(lb.LoadBalancerName ?? ' ')).map(it => it.subnetId),
    })) ?? []
  )
}

export type RdsModel = {
  id: string
  arn: string
  logicalId: string | undefined
  vpcId: string
  subnets: string[]
  secGroups: string[]
  enis: string[]
}
export async function getAllRdsInstances(enis: EniModel[]): Promise<RdsModel[]> {
  const response = await allPagesThrowing(rdsApi.describeDBInstances(), (acc, next) => ({
    DBInstances: [...(acc.DBInstances ?? []), ...(next.DBInstances ?? [])],
  }))
  return (
    response.DBInstances?.map(db => {
      const subnets = db.DBSubnetGroup?.Subnets?.map(it => it.SubnetIdentifier ?? '?subnet') ?? []
      const secGroups =
        db.VpcSecurityGroups?.filter(it => it.Status == 'active')?.map(it => it.VpcSecurityGroupId ?? '?vpc') ?? []
      return {
        id: db.DBInstanceIdentifier ?? 'unknown-rds-instance',
        arn: db.DBInstanceArn ?? 'unknown-rds-instance',
        logicalId: db.TagList?.find(it => it.Key == 'aws:cloudformation:logical-id')?.Value,
        vpcId: db.DBSubnetGroup?.VpcId ?? '?vpc',
        subnets,
        secGroups,
        // TODO: This isn't a foolproof matching!  If you have many RDSs with the same security group assigned, you will get incorrect ENIs
        enis: enis
          .filter(
            eni =>
              eni.description == 'RDSNetworkInterface' &&
              subnets.includes(eni.subnetId) &&
              intersectionOf(eni.secGroups, secGroups).length > 0
          )
          .map(it => it.id),
      }
    }) ?? []
  )
}

function intersectionOf<T>(a: T[], b: T[]): T[] {
  return [...a].filter(it => b.includes(it))
}

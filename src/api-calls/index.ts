import { ApiGwVpcLinkModel, getAllApiGwVpcLinks } from './api-gw'
import { Ec2Model, getAllEc2Instances } from './ec2'
import { EcsTaskModel, getAllEcsClusters, getAllEcsTasks } from './ecs'
import { getAllLoadBalancers, LoadBalancerModel } from './elb'
import { EniModel, getAllEnis } from './eni'
import { getAllInternetGateways, InternetGatewayModel } from './igw'
import { getAllKafkaNodes, KafkaNodeModel } from './kafka'
import { getAllLambdas, LambdaModel } from './lambda'
import { getAllNacls, NaclModel } from './nacl'
import { getAllNatGateways, NatGatewayModel } from './nat-gw'
import { getAllRdsInstances, RdsModel } from './rds'
import { getAllRouteTables, RouteTableModel } from './route-table'
import { getAllSecurityGroups, SecGroupModel } from './sec-group'
import { getAllSubnets, SubnetModel } from './subnet'
import { getAllTgwAttachments, TgwAttachmentModel } from './tgw'
import { getAllVpcs, VpcModel } from './vpc'
import { getAllVpcEndpoints, VpcEndpointModel } from './vpc-endpoint'
import { getAllVpcPeerings, VpcPeeringModel } from './vpc-peering'
import { getAllVirtualGateways, VgwModel } from './vpns'

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
  ec2s: Ec2Model[]
  virtualGateways: VgwModel[]
  tgwAttachments: TgwAttachmentModel[]
  lambdas: LambdaModel[]
  apiGwVpcLinks: ApiGwVpcLinkModel[]
  kafkaNodes: KafkaNodeModel[]
}
export async function getAllResources(mock?: AllResources): Promise<AllResources> {
  if (mock) return mock

  const [vpcs, subnets, enis, nacls, secGroups, vpcPeerings, intGws, natGws, routeTables, ecsClusters] =
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
      getAllEcsClusters(),
    ])
  const [
    ec2s,
    vpcEndpoints,
    ecsTasks,
    loadBalancers,
    rds,
    virtualGateways,
    tgwAttachments,
    lambdas,
    apiGwVpcLinks,
    kafkaNodes,
  ] = await Promise.all([
    getAllEc2Instances(),
    getAllVpcEndpoints(),
    getAllEcsTasks(ecsClusters),
    getAllLoadBalancers(enis),
    getAllRdsInstances(enis),
    getAllVirtualGateways(),
    getAllTgwAttachments(enis),
    getAllLambdas(enis),
    getAllApiGwVpcLinks(enis),
    getAllKafkaNodes(),
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
    ec2s,
    virtualGateways,
    tgwAttachments,
    lambdas,
    apiGwVpcLinks,
    kafkaNodes,
  }
  return Object.freeze(allResources)
}

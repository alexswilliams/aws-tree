import { EC2Client, paginateDescribeRouteTables } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

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
    propagated: boolean
  }[]
}
export async function getAllRouteTables(): Promise<RouteTableModel[]> {
  const response = await combineAllPages(paginateDescribeRouteTables({ client }, {}), it => it.RouteTables)
  return (
    response.map(table => ({
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
            route.CarrierGatewayId ??
            route.EgressOnlyInternetGatewayId ??
            route.GatewayId ??
            route.InstanceId ??
            route.LocalGatewayId ??
            route.NatGatewayId ??
            route.NetworkInterfaceId ??
            route.TransitGatewayId ??
            route.VpcPeeringConnectionId ??
            'unknown',
          state: route.State ?? 'unknown',
          propagated: route.Origin == 'EnableVgwRoutePropagation',
        })) ?? [],
    })) ?? []
  )
}

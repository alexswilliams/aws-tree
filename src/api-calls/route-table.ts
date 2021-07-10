import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

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

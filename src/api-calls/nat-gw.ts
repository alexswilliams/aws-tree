import { EC2Client, paginateDescribeNatGateways } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

export type NatGatewayModel = {
  id: string
  name: string | undefined
  subnetId: string
  enis: string[]
}
export async function getAllNatGateways(): Promise<NatGatewayModel[]> {
  const response = await combineAllPages(paginateDescribeNatGateways({ client }, {}), it => it.NatGateways)
  return (
    response.map(natgw => ({
      id: natgw.NatGatewayId ?? 'unknown-nat-gw',
      name: natgw.Tags?.find(it => it.Key == 'Name')?.Value,
      subnetId: natgw.SubnetId ?? '?subnet',
      enis: natgw.NatGatewayAddresses?.map(it => it.NetworkInterfaceId ?? '?eni') ?? [],
    })) ?? []
  )
}

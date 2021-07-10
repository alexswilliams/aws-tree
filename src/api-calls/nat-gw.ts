import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

export type NatGatewayModel = {
  id: string
  name: string | undefined
  subnetId: string
  enis: string[]
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
      enis: natgw.NatGatewayAddresses?.map(it => it.NetworkInterfaceId ?? '?eni') ?? [],
    })) ?? []
  )
}

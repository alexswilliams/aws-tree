import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

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

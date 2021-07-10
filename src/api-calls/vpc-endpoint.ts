import { EC2Client, paginateDescribeVpcEndpoints } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

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
  const response = await combineAllPages(paginateDescribeVpcEndpoints({ client }, {}), it => it.VpcEndpoints)
  return (
    response.map(endpoint => ({
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

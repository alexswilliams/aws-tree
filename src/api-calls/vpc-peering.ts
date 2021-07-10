import { EC2Client, paginateDescribeVpcPeeringConnections } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

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
  const response = await combineAllPages(
    paginateDescribeVpcPeeringConnections({ client }, {}),
    it => it.VpcPeeringConnections
  )
  return (
    response.map(pcx => ({
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

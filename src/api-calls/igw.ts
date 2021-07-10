import { EC2Client, paginateDescribeInternetGateways } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

export type InternetGatewayModel = {
  id: string
  name: string | undefined
  vpcIds: string[]
}
export async function getAllInternetGateways(): Promise<InternetGatewayModel[]> {
  const response = await combineAllPages(paginateDescribeInternetGateways({ client }, {}), it => it.InternetGateways)
  return (
    response.map(igw => ({
      id: igw.InternetGatewayId ?? 'unknown-igw',
      name: igw.Tags?.find(it => it.Key == 'Name')?.Value,
      vpcIds: igw.Attachments?.filter(it => it.State == 'available')?.map(it => it.VpcId ?? '?vpc') ?? [],
    })) ?? []
  )
}

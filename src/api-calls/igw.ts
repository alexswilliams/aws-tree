import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

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

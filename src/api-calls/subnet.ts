import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

export type SubnetModel = {
  id: string
  name: string | undefined
  vpcId: string
  az: string
  v4Cidr: string
  availableIps: number
}
export async function getAllSubnets(): Promise<SubnetModel[]> {
  const subnetsResponse = await allPagesThrowing(ec2Api.describeSubnets(), (acc, next) => ({
    Subnets: [...(acc.Subnets ?? []), ...(next.Subnets ?? [])],
  }))
  return (
    subnetsResponse.Subnets?.map(subnet => ({
      id: subnet.SubnetId ?? 'unknown-subnet',
      name: subnet.Tags?.find(it => it.Key == 'Name')?.Value,
      vpcId: subnet.VpcId ?? '?vpc',
      az: subnet.AvailabilityZone ?? '?az',
      v4Cidr: subnet.CidrBlock ?? 'cidrv4',
      availableIps: subnet.AvailableIpAddressCount ?? 0,
    })) ?? []
  )
}

import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

export type VpcModel = {
  id: string
  name: string | undefined
  v4Cidrs: string[]
  accountId: string
}
export async function getAllVpcs(): Promise<VpcModel[]> {
  const vpcResponse = await allPagesThrowing(ec2Api.describeVpcs(), (acc, next) => ({
    Vpcs: [...(acc.Vpcs ?? []), ...(next.Vpcs ?? [])],
  }))
  return (
    vpcResponse.Vpcs?.map(vpc => ({
      id: vpc.VpcId ?? 'unknown-vpc',
      name: vpc.Tags?.find(it => it.Key == 'Name')?.Value,
      v4Cidrs: vpc.CidrBlockAssociationSet?.map(it => it.CidrBlock ?? '?cidrv4') ?? [vpc.CidrBlock ?? 'cidrv4'],
      accountId: vpc.OwnerId ?? '?account',
    })) ?? []
  )
}

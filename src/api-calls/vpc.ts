import { EC2Client, paginateDescribeVpcs } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

export type VpcModel = {
  id: string
  name: string | undefined
  v4Cidrs: string[]
  accountId: string
}
export async function getAllVpcs(): Promise<VpcModel[]> {
  const response = await combineAllPages(paginateDescribeVpcs({ client }, {}), it => it.Vpcs)
  return (
    response.map(vpc => ({
      id: vpc.VpcId ?? 'unknown-vpc',
      name: vpc.Tags?.find(it => it.Key == 'Name')?.Value,
      v4Cidrs: vpc.CidrBlockAssociationSet?.map(it => it.CidrBlock ?? '?cidrv4') ?? [vpc.CidrBlock ?? 'cidrv4'],
      accountId: vpc.OwnerId ?? '?account',
    })) ?? []
  )
}

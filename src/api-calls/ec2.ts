import { EC2Client, paginateDescribeInstances } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

export type Ec2Model = {
  id: string
  name: string | undefined
  logicalId: string | undefined
  type: string
  state: string
  vpcId: string
  subnets: string[]
  enis: string[]
}
export async function getAllEc2Instances(): Promise<Ec2Model[]> {
  const response = await combineAllPages(paginateDescribeInstances({ client: client }, {}), x =>
    x.Reservations?.flatMap(it => it.Instances)
  )
  return response.map(inst => {
    return {
      id: inst.InstanceId ?? 'unknown-ec2-instance',
      name: inst.Tags?.find(it => it.Key == 'Name')?.Value,
      logicalId: inst.Tags?.find(it => it.Key == 'aws:cloudformation:logical-id')?.Value,
      type: inst.InstanceType ?? 'unknown',
      state: inst.State?.Name ?? 'unknown',
      vpcId: inst.VpcId ?? '?vpc',
      subnets: inst.NetworkInterfaces?.map(it => it.SubnetId ?? '?subnet') ?? [],
      enis: inst.NetworkInterfaces?.map(it => it.NetworkInterfaceId ?? '?eni?') ?? [],
    }
  })
}

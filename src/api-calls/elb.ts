import { ElasticLoadBalancingV2Client, paginateDescribeLoadBalancers } from '@aws-sdk/client-elastic-load-balancing-v2'
import { combineAllPages } from '../helper'
import type { EniModel } from './eni'
const client = new ElasticLoadBalancingV2Client({})

export type LoadBalancerModel = {
  arn: string
  name: string
  type: string
  vpcId: string
  enis: string[]
  subnets: string[]
}
export async function getAllLoadBalancers(enis: EniModel[]): Promise<LoadBalancerModel[]> {
  const response = await combineAllPages(paginateDescribeLoadBalancers({ client }, {}), it => it.LoadBalancers)

  return (
    response.map(lb => ({
      arn: lb.LoadBalancerArn ?? 'unknown-load-balancer',
      name: lb.LoadBalancerName ?? 'unknown-load-balancer',
      type: lb.Type ?? 'unknown',
      vpcId: lb.VpcId ?? '?vpc',
      enis: enis.filter(it => it.description?.includes(lb.LoadBalancerName ?? ' ')).map(it => it.id),
      subnets: enis.filter(it => it.description?.includes(lb.LoadBalancerName ?? ' ')).map(it => it.subnetId),
    })) ?? []
  )
}

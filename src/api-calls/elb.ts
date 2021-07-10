import { ELBv2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
import type { EniModel } from './eni'
const elbApi = new ELBv2()

export type LoadBalancerModel = {
  arn: string
  name: string
  type: string
  vpcId: string
  enis: string[]
  subnets: string[]
}
export async function getAllLoadBalancers(enis: EniModel[]): Promise<LoadBalancerModel[]> {
  const response = await allPagesThrowing(elbApi.describeLoadBalancers(), (acc, next) => ({
    LoadBalancers: [...(acc.LoadBalancers ?? []), ...(next.LoadBalancers ?? [])],
  }))
  return (
    response.LoadBalancers?.map(lb => ({
      arn: lb.LoadBalancerArn ?? 'unknown-load-balancer',
      name: lb.LoadBalancerName ?? 'unknown-load-balancer',
      type: lb.Type ?? 'unknown',
      vpcId: lb.VpcId ?? '?vpc',
      enis: enis.filter(it => it.description?.includes(lb.LoadBalancerName ?? ' ')).map(it => it.id),
      subnets: enis.filter(it => it.description?.includes(lb.LoadBalancerName ?? ' ')).map(it => it.subnetId),
    })) ?? []
  )
}

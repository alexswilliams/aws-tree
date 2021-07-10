import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

export type NaclModel = {
  id: string
  vpcId: string
  logicalId: string | undefined
  associatedSubnets: string[]
  isDefault: boolean
  ingress: {
    ruleNumber: number
    from: string
    destPorts: string | undefined
    action: string
  }[]
  egress: {
    ruleNumber: number
    to: string
    destPorts: string | undefined
    action: string
  }[]
}
export async function getAllNacls(): Promise<NaclModel[]> {
  const naclsResponse = await allPagesThrowing(ec2Api.describeNetworkAcls(), (acc, next) => ({
    NetworkAcls: [...(acc.NetworkAcls ?? []), ...(next.NetworkAcls ?? [])],
  }))
  return (
    naclsResponse.NetworkAcls?.map(nacl => ({
      id: nacl.NetworkAclId ?? 'unknown-nacl',
      vpcId: nacl.VpcId ?? 'unknown-vpc',
      logicalId: nacl.Tags?.find(it => it.Key == 'aws:cloudformation:logical-id')?.Value,
      associatedSubnets: nacl.Associations?.map(ass => ass.SubnetId ?? '?subnet') ?? [],
      isDefault: nacl.IsDefault ?? false,
      ingress:
        nacl.Entries?.filter(it => it.Egress != true)?.map(it => ({
          ruleNumber: it.RuleNumber ?? -1,
          from: [it.CidrBlock ?? '', it.Ipv6CidrBlock ?? ''].filter(it => it != '').join(','),
          destPorts:
            it.PortRange?.To == it.PortRange?.From
              ? it.PortRange?.From?.toString()
              : `${it.PortRange?.From}-${it.PortRange?.To}`,
          action: it.RuleAction ?? '?action',
        })) ?? [],
      egress:
        nacl.Entries?.filter(it => it.Egress == true)?.map(it => ({
          ruleNumber: it.RuleNumber ?? -1,
          to: [it.CidrBlock ?? '', it.Ipv6CidrBlock ?? ''].filter(it => it != '').join(','),
          destPorts:
            it.PortRange?.To == it.PortRange?.From
              ? it.PortRange?.From?.toString()
              : `${it.PortRange?.From}-${it.PortRange?.To}`,
          action: it.RuleAction ?? '?action',
        })) ?? [],
    })) ?? []
  )
}

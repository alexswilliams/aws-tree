import { EC2Client, paginateDescribeNetworkAcls } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

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
  const response = await combineAllPages(paginateDescribeNetworkAcls({ client }, {}), it => it.NetworkAcls)
  return (
    response.map(nacl => ({
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

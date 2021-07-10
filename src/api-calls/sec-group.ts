import { EC2Client, paginateDescribeSecurityGroups } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

export type SecGroupModel = {
  id: string
  vpcId: string
  name: string | undefined
  description: string | undefined
  ingress: {
    port: string
    from: string[]
  }[]
  egress: {
    port: string
    to: string[]
  }[]
}
export async function getAllSecurityGroups(): Promise<SecGroupModel[]> {
  const response = await combineAllPages(paginateDescribeSecurityGroups({ client }, {}), it => it.SecurityGroups)
  return (
    response.map(sg => ({
      id: sg.GroupId ?? 'unknown-sec-group',
      vpcId: sg.VpcId ?? 'unknown-vpc',
      name: sg.GroupName,
      description: sg.Description,
      ingress:
        sg.IpPermissions?.map(rule => ({
          port: rule.FromPort == rule.ToPort ? rule.FromPort?.toString() ?? '-1' : `${rule.FromPort}-${rule.ToPort}`,
          from: [
            ...(rule.IpRanges?.map(ip => ip.CidrIp ?? '?v4cidr') ?? []),
            ...(rule.Ipv6Ranges?.map(ip => ip.CidrIpv6 ?? '?v6cidr') ?? []),
            ...(rule.PrefixListIds?.map(list => list.PrefixListId ?? '?prefixlist') ?? []),
            ...(rule.UserIdGroupPairs?.map(sg => sg.GroupId ?? '?secgroup') ?? []),
          ],
        })) ?? [],
      egress:
        sg.IpPermissionsEgress?.map(rule => ({
          port: rule.FromPort == rule.ToPort ? rule.FromPort?.toString() ?? '-1' : `${rule.FromPort}-${rule.ToPort}`,
          to: [
            ...(rule.IpRanges?.map(ip => ip.CidrIp ?? '?v4cidr') ?? []),
            ...(rule.Ipv6Ranges?.map(ip => ip.CidrIpv6 ?? '?v6cidr') ?? []),
            ...(rule.PrefixListIds?.map(list => list.PrefixListId ?? '?prefixlist') ?? []),
            ...(rule.UserIdGroupPairs?.map(sg => sg.GroupId ?? '?secgroup') ?? []),
          ],
        })) ?? [],
    })) ?? []
  )
}

import { EC2Client, paginateDescribeNetworkInterfaces } from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
const client = new EC2Client({})

export type EniModel = {
  id: string
  description: string | undefined
  subnetId: string
  interfaceType: string // interface, vpc_endpoint, api_gateway_managed, lambda, ...
  interfaceOwner: string | undefined
  vpcLinkId: string | undefined
  ips: {
    private: string
    public: string | undefined
    ownedBy: string | undefined
  }[]
  secGroups: string[]
}
export async function getAllEnis(): Promise<EniModel[]> {
  const response = await combineAllPages(paginateDescribeNetworkInterfaces({ client }, {}), it => it.NetworkInterfaces)
  return (
    response.map(eni => ({
      id: eni.NetworkInterfaceId ?? 'unknown-eni',
      description: eni.Description,
      subnetId: eni.SubnetId ?? '?subnet',
      interfaceType: eni.InterfaceType ?? 'interface',
      interfaceOwner: eni.RequesterId,
      vpcLinkId:
        eni.InterfaceType == 'api_gateway_managed' ? eni.TagSet?.find(it => it.Key == 'VpcLinkId')?.Value : undefined,
      ips:
        eni.PrivateIpAddresses?.map(it => ({
          private: it.PrivateIpAddress ?? '?ipv4',
          public: it.Association?.PublicIp,
          ownedBy: it.Association?.IpOwnerId,
        })) ?? [],
      secGroups: eni.Groups?.map(it => it.GroupId ?? '?secgroup') ?? [],
    })) ?? []
  )
}

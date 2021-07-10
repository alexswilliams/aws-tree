import { EC2 } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ec2Api = new EC2()

export type EniModel = {
  id: string
  description: string | undefined
  subnetId: string
  ips: {
    private: string
    public: string | undefined
    ownedBy: string | undefined
  }[]
  secGroups: string[]
}
export async function getAllEnis(): Promise<EniModel[]> {
  const enisResponse = await allPagesThrowing(ec2Api.describeNetworkInterfaces(), (acc, next) => ({
    NetworkInterfaces: [...(acc.NetworkInterfaces ?? []), ...(next.NetworkInterfaces ?? [])],
  }))
  return (
    enisResponse.NetworkInterfaces?.map(eni => ({
      id: eni.NetworkInterfaceId ?? 'unknown-eni',
      description: eni.Description,
      subnetId: eni.SubnetId ?? '?subnet',
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

import {
  EC2Client,
  paginateDescribeTransitGatewayAttachments,
  paginateDescribeTransitGateways,
} from '@aws-sdk/client-ec2'
import { combineAllPages } from '../helper'
import type { EniModel } from './eni'
const client = new EC2Client({})

export type TgwModel = {
  id: string
  name: string | undefined
  description: string | undefined
  state: string
  owner: string
  asn: number | undefined
}
export type TgwAttachmentModel = {
  id: string
  name: string | undefined
  logicalId: string | undefined
  tgw: TgwModel | undefined
  state: string
  vpcId: string | undefined
  subnets: string[]
  enis: string[]
}

export async function getAllTgwAttachments(enis: EniModel[]): Promise<TgwAttachmentModel[]> {
  const [attachmentsResponse, tgwResponse] = await Promise.all([
    combineAllPages(paginateDescribeTransitGatewayAttachments({ client }, {}), it => it.TransitGatewayAttachments),
    combineAllPages(paginateDescribeTransitGateways({ client }, {}), it => it.TransitGateways),
  ])

  const tgws: TgwModel[] =
    tgwResponse.map(tgw => ({
      id: tgw.TransitGatewayId ?? 'unknown-tgw',
      name: tgw.Tags?.find(it => it.Key == 'Name')?.Value,
      description: tgw.Description,
      state: tgw.State ?? 'unknown',
      owner: tgw.OwnerId ?? 'unknown',
      asn: tgw.Options?.AmazonSideAsn,
    })) ?? []

  return (
    attachmentsResponse.map(att => ({
      id: att.TransitGatewayAttachmentId ?? 'unknown-tgw-attachment',
      name: att.Tags?.find(it => it.Key == 'Name')?.Value,
      logicalId: att.Tags?.find(it => it.Key == 'aws:cloudformation:logical-id' || it.Key == 'logical-id')?.Value,
      tgw: tgws.find(it => it.id == att.TransitGatewayId),
      state: att.State ?? 'unknown',
      vpcId: att.ResourceType == 'vpc' ? att.ResourceId : '?vpc',
      enis: enis
        .filter(eni => eni.description?.includes(att.TransitGatewayAttachmentId ?? 'tgw-attach-xxxxx'))
        .map(it => it.id),
      subnets: enis
        .filter(eni => eni.description?.includes(att.TransitGatewayAttachmentId ?? 'tgw-attach-xxxxx'))
        .map(it => it.subnetId),
    })) ?? []
  )
}

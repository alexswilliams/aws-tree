import {
  DescribeCustomerGatewaysCommand,
  DescribeVpnConnectionsCommand,
  DescribeVpnGatewaysCommand,
  EC2Client,
} from '@aws-sdk/client-ec2'
const client = new EC2Client({})

export type CustomerGatewayModel = {
  id: string
  name: string | undefined
  state: string
  type: string
  asn: string | undefined
  ip: string
}
export type VpnConnectionModel = {
  id: string
  name: string | undefined
  tunnels: {
    outsideIp: string
    status: string
  }[]
  customerGatewayId: string | undefined
  customerGateway: CustomerGatewayModel | undefined
  vpnGatewayId: string | undefined
  transitGatewayId: string | undefined
  state: string
  type: string
}
export type VgwModel = {
  id: string
  name: string | undefined
  logicalId: string | undefined
  asn: number | undefined
  type: string
  state: string
  vpcIds: string[]
  vpnConnections: VpnConnectionModel[]
}
export async function getAllVirtualGateways(): Promise<VgwModel[]> {
  const [vpnGateways, vpnConnections, customerGateways] = await Promise.all([
    client.send(new DescribeVpnGatewaysCommand({})),
    client.send(new DescribeVpnConnectionsCommand({})),
    client.send(new DescribeCustomerGatewaysCommand({})),
  ])

  const custGateways: CustomerGatewayModel[] =
    customerGateways.CustomerGateways?.map(cgw => ({
      id: cgw.CustomerGatewayId ?? 'unknown-customer-gateway',
      name: cgw.Tags?.find(it => it.Key == 'Name')?.Value,
      state: cgw.State ?? 'unknown',
      type: cgw.Type ?? 'unknown',
      asn: cgw.BgpAsn,
      ip: cgw.IpAddress ?? '?ipv4',
    })) ?? []

  const vpnConns: VpnConnectionModel[] =
    vpnConnections.VpnConnections?.map(vpn => ({
      id: vpn.VpnConnectionId ?? 'unknown-vpn-connection',
      name: vpn.Tags?.find(it => it.Key == 'Name')?.Value,
      tunnels:
        vpn.VgwTelemetry?.map(it => ({
          outsideIp: it.OutsideIpAddress ?? '?ipv4',
          status: it.Status ?? 'unknown',
        })) ?? [],
      customerGatewayId: vpn.CustomerGatewayId,
      customerGateway: custGateways.find(it => it.id == vpn.CustomerGatewayId),
      vpnGatewayId: vpn.VpnGatewayId,
      transitGatewayId: vpn.TransitGatewayId,
      state: vpn.State ?? 'unknown',
      type: vpn.Type ?? 'unknown',
    })) ?? []

  return (
    vpnGateways.VpnGateways?.map(vgw => ({
      id: vgw.VpnGatewayId ?? 'unknown-virtual-gateway',
      name: vgw.Tags?.find(it => it.Key == 'Name')?.Value,
      logicalId: vgw.Tags?.find(it => it.Key == 'aws:cloudformation:logical-id')?.Value,
      asn: vgw.AmazonSideAsn,
      type: vgw.Type ?? 'unknown',
      state: vgw.State ?? 'unknown',
      vpcIds: vgw.VpcAttachments?.filter(it => it.State == 'attached')?.map(it => it.VpcId ?? '?vpc') ?? [],
      vpnConnections: vpnConns?.filter(vpn => vgw.VpnGatewayId ?? 'unknown' == vpn.vpnGatewayId),
    })) ?? []
  )
}

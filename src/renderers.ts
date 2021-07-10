import 'colors'
import type { AllResources } from './api-calls'
import type { Ec2Model } from './api-calls/ec2'
import type { EcsTaskModel } from './api-calls/ecs'
import type { LoadBalancerModel } from './api-calls/elb'
import type { EniModel } from './api-calls/eni'
import type { InternetGatewayModel } from './api-calls/igw'
import type { NaclModel } from './api-calls/nacl'
import type { NatGatewayModel } from './api-calls/nat-gw'
import type { RdsModel } from './api-calls/rds'
import type { RouteTableModel } from './api-calls/route-table'
import type { SecGroupModel } from './api-calls/sec-group'
import type { SubnetModel } from './api-calls/subnet'
import type { CustomerGatewayModel, VgwModel, VpnConnectionModel } from './api-calls/vpns'
import type { VpcModel } from './api-calls/vpc'
import type { VpcEndpointModel } from './api-calls/vpc-endpoint'
import type { VpcPeeringModel } from './api-calls/vpc-peering'
import { makeName } from './helper'
import type { TgwAttachmentModel, TgwModel } from './api-calls/tgw'
import type { LambdaModel } from './api-calls/lambda'

export function renderVpcs(vpcs: VpcModel[], all: AllResources): void {
  const indent = '│'.grey
  all.vpcs.forEach(vpc => {
    console.log('')
    console.log('╒══════════════════════════════════════')
    console.log(`${indent} ${vpc.id}${vpc.name ? ` (${vpc.name.green})` : ''}`)
    vpc.v4Cidrs.forEach(cidr => console.log(`${indent}  • ${cidr.cyan}`))

    renderRouteTables(
      indent,
      all.routeTables.filter(it => it.isMain && it.vpcId == vpc.id)
    )
    renderInternetGateways(
      indent,
      all.intGws.filter(it => it.vpcIds.includes(vpc.id))
    )
    renderVirtualGateways(
      indent,
      all.virtualGateways.filter(it => it.vpcIds.includes(vpc.id))
    )
    renderVpcPeering(
      indent,
      all.vpcPeerings.filter(it => it.requester.vpcId == vpc.id || it.accepter.vpcId == vpc.id),
      vpc.id
    )
    renderVpcEndpoints(
      indent,
      all.vpcEndpoints.filter(it => it.vpcId == vpc.id && it.enis.length == 0),
      undefined,
      all
    )
    renderNacls(
      indent,
      all.nacls.filter(it => it.vpcId == vpc.id && it.associatedSubnets.length == 0)
    )
    renderSubnets(
      indent,
      all.subnets.filter(it => it.vpcId == vpc.id),
      all
    )
  })
}

function renderSubnets(indent: string, subnets: SubnetModel[], all: AllResources) {
  const newIndent = `${indent} ${'│'.grey}`
  subnets.forEach(net => {
    console.log(indent)
    console.log(indent + '╲'.grey)
    console.log(`${newIndent} ${net.id}${net.name ? ` (${net.name.green})` : ''}`)
    console.log(`${newIndent}   AZ: ${net.az.grey}`)
    console.log(`${newIndent}   CIDR: ${net.v4Cidr.cyan} (${net.availableIps} available IPs)`)

    renderRouteTables(
      newIndent,
      all.routeTables.filter(it => it.subnetAssociations.includes(net.id))
    )

    renderNacls(
      newIndent,
      all.nacls.filter(it => it.associatedSubnets.includes(net.id))
    )

    renderNatGateways(
      newIndent,
      all.natGws.filter(it => it.subnetId == net.id),
      all
    )

    renderTransitGatewayAttachments(
      newIndent,
      all.tgwAttachments.filter(it => it.subnets.includes(net.id)),
      net.id,
      all
    )

    const enisInThisSubnet = all.enis.filter(it => it.subnetId == net.id).map(it => it.id)
    renderVpcEndpoints(
      newIndent,
      all.vpcEndpoints.filter(
        it => it.vpcId == net.vpcId && it.enis.length > 0 && it.enis.some(eni => enisInThisSubnet.includes(eni))
      ),
      net.id,
      all
    )

    renderLoadBalancers(
      newIndent,
      all.loadBalancers.filter(it => it.vpcId == net.vpcId && it.subnets.includes(net.id)),
      net.id,
      all
    )

    renderEc2s(
      newIndent,
      all.ec2s.filter(it => it.vpcId == net.vpcId && it.subnets.includes(net.id)),
      net.id,
      all
    )

    renderEcsTaskAttachments(
      newIndent,
      all.ecsTasks.filter(it => it.subnetIds.includes(net.id)),
      net.id,
      all
    )

    renderRdsInstances(
      newIndent,
      all.rds.filter(
        it =>
          it.subnets.includes(net.id) &&
          all.enis.filter(eni => it.enis.includes(eni.id) && eni.subnetId == net.id).length > 0
      ),
      net.id,
      all
    )

    renderLambdas(
      newIndent,
      all.lambdas.filter(it => it.subnetIds.includes(net.id)),
      net.id,
      all
    )

    const unknownEnis = enisInThisSubnet
      .without(all.natGws.flatMap(it => it.enis))
      .without(all.vpcEndpoints.flatMap(it => it.enis))
      .without(all.loadBalancers.flatMap(it => it.enis))
      .without(all.ecsTasks.flatMap(it => it.enis))
      .without(all.rds.flatMap(it => it.enis))
      .without(all.ec2s.flatMap(it => it.enis))
      .without(all.tgwAttachments.flatMap(it => it.enis))
      .without(all.lambdas.flatMap(it => it.enis))

    if (unknownEnis.length > 0) {
      console.log(newIndent)
      console.log(newIndent + ` ! ${unknownEnis.length} ENIs are unaccounted for in the above list:`.red.bold)
      renderEnis(
        newIndent,
        all.enis.filter(it => unknownEnis.includes(it.id)),
        all
      )
    }
  })
}

function renderVirtualGateways(indent: string, vgws: VgwModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  vgws.forEach(vgw => {
    console.log(indent + '╲'.grey)
    const name = makeName(vgw.name, vgw.logicalId)
    const state = vgw.state == 'available' ? vgw.state.green : vgw.state.red
    console.log(`${newIndent} ${vgw.id}${name ? ` (${name})` : ''} - ${state}`)
    console.log(`${newIndent}   Type: ${vgw.type}`)
    if (vgw.asn) console.log(`${newIndent}   ASN: ${vgw.asn.toString().cyan}`)
    renderVpnConnections(newIndent, vgw.vpnConnections)
  })
}
function renderVpnConnections(indent: string, vpns: VpnConnectionModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  vpns.forEach(vpn => {
    console.log(indent + '╲'.grey)
    const state = vpn.state == 'available' ? vpn.state.green : vpn.state.red
    const name = vpn.name ? ` (${vpn.name.green})` : ''
    console.log(`${newIndent} ${vpn.id}${name} - ${state}`)
    console.log(`${newIndent}   Type: ${vpn.type}`)

    if (vpn.tunnels.length > 0) {
      console.log(`${newIndent}   Tunnels:`)
      vpn.tunnels.forEach(tun => {
        const status = tun.status == 'UP' ? tun.status.green : tun.status.red
        console.log(`${newIndent}     • ${tun.outsideIp.cyan} - ${status}`)
      })
    }

    if (vpn.customerGateway) renderCustomerGateways(newIndent, [vpn.customerGateway])
  })
}
function renderCustomerGateways(indent: string, cgws: CustomerGatewayModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  cgws.forEach(cgw => {
    console.log(indent + '╲'.grey)
    const state = cgw.state == 'available' ? cgw.state.green : cgw.state.red
    const name = cgw.name ? ` (${cgw.name.green})` : ''
    console.log(`${newIndent} ${cgw.id}${name} - ${state}`)
    console.log(`${newIndent}   Type: ${cgw.type}`)
    console.log(`${newIndent}   IP: ${cgw.ip.cyan}`)
    if (cgw.asn) console.log(`${newIndent}   ASN: ${cgw.asn.cyan}`)
  })
}

function renderTransitGatewayAttachments(
  indent: string,
  atts: TgwAttachmentModel[],
  subnetId: string,
  all: AllResources
) {
  const newIndent = `${indent} ${'│'.grey}`
  atts.forEach(att => {
    console.log(indent + '╲'.grey)
    const name = makeName(att.name, att.logicalId)
    const nameView = name ? ` (${name})` : ''
    const state = att.state == 'available' ? att.state.green : att.state.red
    console.log(`${newIndent} ${att.id}${nameView} - ${state}`)

    renderEnis(
      newIndent,
      all.enis.filter(eni => eni.subnetId == subnetId && att.enis.includes(eni.id)),
      all
    )
    if (att.tgw) renderTransitGateways(newIndent, [att.tgw])
  })
}
function renderTransitGateways(indent: string, tgws: TgwModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  tgws.forEach(tgw => {
    console.log(indent + '╲'.grey)
    const name = makeName(tgw.name, tgw.description)
    const nameView = name ? ` (${name})` : ''
    const state = tgw.state == 'available' ? tgw.state.green : tgw.state.red
    console.log(`${newIndent} ${tgw.id}${nameView} - ${state}`)
    console.log(`${newIndent}   Owner: ${tgw.owner.yellow}`)
    if (tgw.asn) console.log(`${newIndent}   ASN: ${tgw.asn.toString().cyan}`)
  })
}

function renderRouteTables(indent: string, tables: RouteTableModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  tables.forEach(table => {
    console.log(indent + '╲'.grey)
    const main = table.isMain ? ` [${'VPC Default'.yellow}]` : ''
    console.log(`${newIndent} ${table.id}${main}${table.name ? ` (${table.name.green})` : ''}`)
    table.routes.forEach(route => {
      const propagated = route.propagated ? ' [' + 'propagated'.yellow + ']' : ''
      const state = route.state == 'active' ? route.state.green : route.state.red
      console.log(`${newIndent}  • ${route.destination.cyan}${propagated} via ${route.via.grey} - ${state}`)
    })
  })
}

function renderInternetGateways(indent: string, igws: InternetGatewayModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  igws.forEach(igw => {
    console.log(indent + '╲'.grey)
    console.log(`${newIndent} ${igw.id}${igw.name ? ` (${igw.name.green})` : ''}`)
  })
}

function renderVpcPeering(indent: string, peeringConnections: VpcPeeringModel[], thisVpcId: string) {
  const newIndent = `${indent} ${'│'.grey}`
  peeringConnections.forEach(pcx => {
    console.log(indent + '╲'.grey)

    const status = pcx.status == 'active' ? pcx.status.green : pcx.status.red
    const name = makeName(pcx.name, pcx.logicalId)
    console.log(`${newIndent} ${pcx.id}${name ? ` (${name})` : ''} - ${status}`)

    const requestorVpc =
      pcx.requester.vpcId == thisVpcId
        ? 'This VPC'.grey
        : `${pcx.requester.vpcId.grey} in account ${pcx.requester.account.yellow}`
    console.log(`${newIndent}   Requester: ${requestorVpc}`)
    pcx.requester.cidrs.forEach(cidr => console.log(`${newIndent}     • ${cidr.cyan}`))

    const accepterVpc =
      pcx.accepter.vpcId == thisVpcId
        ? 'This VPC'.grey
        : `${pcx.accepter.vpcId.grey} in account ${pcx.accepter.account.yellow}`
    console.log(`${newIndent}   Accepter: ${accepterVpc}`)
    pcx.accepter.cidrs.forEach(cidr => console.log(`${newIndent}     • ${cidr.cyan}`))
  })
}

function renderNacls(indent: string, nacls: NaclModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  nacls.forEach(nacl => {
    console.log(indent + '╲'.grey)

    const def = nacl.isDefault ? ` [${'VPC Default'.yellow}]` : ''
    console.log(`${newIndent} ${nacl.id}${def}${nacl.logicalId ? ` (${nacl.logicalId.green})` : ''}`)
    console.log(`${newIndent}   Ingress:`)
    nacl.ingress
      .sort((a, b) => a.ruleNumber - b.ruleNumber)
      .forEach(rule => {
        const num = rule.ruleNumber.toString().padStart(5, ' ')
        const ports = rule.destPorts ? rule.destPorts : 'any ports'
        const action = rule.action == 'allow' ? 'ALLOW'.green : 'DENY'.red
        console.log(`${newIndent}     • ${num.grey}: ${action} from ${rule.from.cyan} to ${ports.cyan}`)
      })
    console.log(`${newIndent}   Egress:`)
    nacl.egress
      .sort((a, b) => a.ruleNumber - b.ruleNumber)
      .forEach(rule => {
        const num = rule.ruleNumber.toString().padStart(5, ' ')
        const ports = rule.destPorts ? rule.destPorts : 'any ports'
        const action = rule.action == 'allow' ? 'ALLOW'.green : 'DENY'.red
        console.log(`${newIndent}     • ${num.grey}: ${action} to ${rule.to.cyan} on ${ports.cyan}`)
      })
  })
}

function renderNatGateways(indent: string, gws: NatGatewayModel[], all: AllResources) {
  const newIndent = `${indent} ${'│'.grey}`
  gws.forEach(gw => {
    console.log(indent + '╲'.grey)

    console.log(`${newIndent} ${gw.id}${gw.name ? ` (${gw.name.green})` : ''}`)
    renderEnis(
      newIndent,
      all.enis.filter(it => gw.enis.includes(it.id) && it.subnetId == gw.subnetId),
      all
    )
  })
}

function renderEnis(indent: string, enis: EniModel[], all: AllResources) {
  const firstLine = `${indent} ${'┐'.grey}`
  const newIndent = `${indent} ${'│'.grey}`
  enis.forEach(eni => {
    console.log(`${firstLine} ${eni.id}${eni.description ? ` (${eni.description.grey})` : ''}`)

    eni.ips.forEach(ip => {
      const expr = ip.public ? `${ip.private.cyan} -> ${ip.public.cyan}` : ip.private.cyan
      const owner = ip.ownedBy ? ` (managed by ${ip.ownedBy.yellow})` : ''
      console.log(`${newIndent}   • ${expr}${owner}`)
    })

    renderSecGroups(
      newIndent,
      all.secGroups.filter(it => eni.secGroups.includes(it.id))
    )
  })
}

function renderSecGroups(indent: string, groups: SecGroupModel[]) {
  function ingressLineFromRule(rule: { port: string; from: string[] }): string {
    const src = rule.from.length == 1 && rule.from[0] == '0.0.0.0/0' ? 'any address' : rule.from.join(', ')
    const port = rule.port == '-1' ? 'any port' : rule.port
    return `${'ALLOW'.green} from [${src.cyan}] to ${port.cyan}`
  }
  function egressLineFromRule(rule: { port: string; to: string[] }): string {
    if (rule.to.length == 1 && rule.to.includes('255.255.255.255/32') && rule.port == '252-86') {
      return `${'DENY'.red} to [${'any address'.red}] to ${'any ports'.red}`
    } else {
      const port = rule.port == '-1' ? 'any port' : rule.port
      const dest = rule.to.length == 1 && rule.to[0] == '0.0.0.0/0' ? 'any address' : rule.to.join(', ')
      return `${'ALLOW'.green} to [${dest.cyan}] to ${port.cyan}`
    }
  }
  const firstLine = `${indent} ${'┐'.grey}`
  const newIndent = `${indent} ${'│'.grey}`
  groups.forEach(group => {
    const name = makeName(group.name, group.description)
    console.log(`${firstLine} ${group.id}${name ? `(${name})` : ''}`)

    if (group.ingress.length == 1) {
      console.log(`${newIndent}   Ingress: ${ingressLineFromRule(group.ingress[0])}`)
    }
    if (group.ingress.length > 1) {
      console.log(`${newIndent}   Ingress:`)
      group.ingress.forEach(rule => console.log(`${newIndent}     • ${ingressLineFromRule(rule)}`))
    }
    if (group.egress.length == 1) {
      console.log(`${newIndent}   Egress: ${egressLineFromRule(group.egress[0])}`)
    }
    if (group.egress.length > 1) {
      console.log(`${newIndent}   Egress:`)
      group.egress.forEach(rule => console.log(`${newIndent}     • ${egressLineFromRule(rule)}`))
    }
  })
}

function renderVpcEndpoints(
  indent: string,
  endpoints: VpcEndpointModel[],
  subnetId: string | undefined,
  all: AllResources
) {
  const newIndent = `${indent} ${'│'.grey}`
  endpoints.forEach(endpoint => {
    console.log(indent + '╲'.grey)

    const state = endpoint.state == 'available' ? endpoint.state.green : endpoint.state.red
    console.log(`${newIndent} ${endpoint.id} (${endpoint.type}: ${endpoint.service.green}) - ${state}`)
    if (endpoint.type == 'Interface') console.log(`${newIndent}   Private DNS enabled: ${endpoint.privateDns}`)

    renderEnis(
      newIndent,
      all.enis.filter(it => endpoint.enis.includes(it.id) && it.subnetId == subnetId),
      all
    )
  })
}

function renderEcsTaskAttachments(indent: string, tasks: EcsTaskModel[], subnetId: string, all: AllResources) {
  const newIndent = `${indent} ${'│'.magenta}`
  tasks.forEach(task => {
    console.log(indent + '╲'.magenta)
    console.log(`${newIndent} ECS Task (${task.arn})`)
    const connectivity = task.connectivity == 'CONNECTED' ? task.connectivity.green : task.connectivity.red
    console.log(`${newIndent}   Connectivity: ${connectivity}`)

    const deepIndent = `${newIndent} ${'│'.grey}`
    task.containers.forEach(cont => {
      console.log(newIndent + '╲'.grey)
      console.log(`${deepIndent} ${cont.arn} ${cont.name ? ` (${cont.name.green})` : ''}`)
      console.log(`${deepIndent}   Status: ${cont.status == 'RUNNING' ? cont.status.green : cont.status.red}`)
      console.log(`${deepIndent}   Health: ${cont.health == 'HEALTHY' ? cont.health.green : cont.health.red}`)
      renderEnis(
        deepIndent,
        all.enis.filter(it => cont.enis.includes(it.id) && it.subnetId == subnetId),
        all
      )
    })
  })
}

function renderLoadBalancers(indent: string, lbs: LoadBalancerModel[], subnetId: string, all: AllResources) {
  const newIndent = `${indent} ${'│'.red}`
  lbs.forEach(lb => {
    console.log(indent + '╲'.red)
    console.log(`${newIndent} Load Balancer ${lb.arn} (${lb.name.green})`)
    console.log(`${newIndent}   Type: ${lb.type}`)
    renderEnis(
      newIndent,
      all.enis.filter(it => it.subnetId == subnetId && lb.enis.includes(it.id)),
      all
    )
  })
}

function renderRdsInstances(indent: string, dbs: RdsModel[], subnetId: string, all: AllResources) {
  const newIndent = `${indent} ${'│'.blue}`
  dbs.forEach(db => {
    console.log(indent + '╲'.blue)
    const name = makeName(db.arn, db.logicalId)
    console.log(`${newIndent} RDS ${db.id}${name ? ` (${name})` : ''}`)
    renderEnis(
      newIndent,
      all.enis.filter(it => it.subnetId == subnetId && db.enis.includes(it.id)),
      all
    )
  })
}

function renderEc2s(indent: string, ec2s: Ec2Model[], subnetId: string, all: AllResources) {
  const newIndent = `${indent} ${'│'.green}`
  ec2s.forEach(ec2 => {
    console.log(indent + '╲'.green)
    const name = makeName(ec2.name, ec2.logicalId)
    const state = ec2.state == 'running' ? ec2.state.green : ec2.state.red

    console.log(`${newIndent} EC2 ${ec2.id}${name ? ` (${name})` : ''}`)
    console.log(`${newIndent}   Type: ${ec2.type.yellow}`)
    console.log(`${newIndent}   State: ${state}`)
    renderEnis(
      newIndent,
      all.enis.filter(it => it.subnetId == subnetId && ec2.enis.includes(it.id)),
      all
    )
  })
}

function renderLambdas(indent: string, lambdas: LambdaModel[], subnetId: string, all: AllResources) {
  const newIndent = `${indent} ${'│'.yellow}`
  lambdas.forEach(lambda => {
    console.log(indent + '╲'.yellow)
    console.log(`${newIndent} Lambda ${lambda.id}`)
    if (lambda.runtime) console.log(`${newIndent}   Runtime: ${lambda.runtime}`)
    if (lambda.memorySize) console.log(`${newIndent}   Memory: ${lambda.memorySize.toString().cyan} MiB`)

    renderEnis(
      newIndent,
      all.enis.filter(it => it.subnetId == subnetId && lambda.enis.includes(it.id)),
      all
    )
  })
}

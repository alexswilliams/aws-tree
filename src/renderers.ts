import 'colors'
import type * as api from './api-calls'

function makeNamePair(a: string | undefined, b: string | undefined): string | undefined {
  if (a && b) return a.green + ' / ' + b.grey
  else if (a) return a.green
  else if (b) return b.green
  return undefined
}

export function renderVpcs(vpcs: api.VpcModel[], all: api.AllResources): void {
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

function renderRouteTables(indent: string, tables: api.RouteTableModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  tables.forEach(table => {
    console.log(indent + '╲'.grey)
    const main = table.isMain ? ` [${'VPC Default'.yellow}]` : ''
    console.log(`${newIndent} ${table.id}${main}${table.name ? ` (${table.name.green})` : ''}`)
    table.routes.forEach(route => {
      const state = route.state == 'active' ? route.state.green : route.state.red
      console.log(`${newIndent}  • ${route.destination.cyan} via ${route.via.grey} - ${state}`)
    })
  })
}

function renderInternetGateways(indent: string, igws: api.InternetGatewayModel[]) {
  const newIndent = `${indent} ${'│'.grey}`
  igws.forEach(igw => {
    console.log(indent + '╲'.grey)
    console.log(`${newIndent} ${igw.id}${igw.name ? ` (${igw.name.green})` : ''}`)
  })
}

function renderVpcPeering(indent: string, peeringConnections: api.VpcPeeringModel[], thisVpcId: string) {
  const newIndent = `${indent} ${'│'.grey}`
  peeringConnections.forEach(pcx => {
    console.log(indent + '╲'.grey)

    const status = pcx.status == 'active' ? pcx.status.green : pcx.status.red
    const name = makeNamePair(pcx.name, pcx.logicalId)
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

function renderNacls(indent: string, nacls: api.NaclModel[]) {
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

function renderSubnets(indent: string, subnets: api.SubnetModel[], all: api.AllResources) {
  const newIndent = `${indent} ${'│'.yellow}`
  subnets.forEach(net => {
    console.log(indent)
    console.log(indent + '╲'.yellow)
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

    const enisInThisSubnet = all.enis.filter(it => (it.subnetId = net.id)).map(it => it.id)
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

    renderEcsTaskAttachments(
      newIndent,
      all.ecsTasks.filter(it => it.subnetIds.includes(net.id)),
      all
    )

    renderRdsInstances(
      newIndent,
      all.rds.filter(it => it.subnets.includes(net.id)),
      net.id,
      all
    )

    const unknownEnis = enisInThisSubnet
      .without(all.natGws.flatMap(it => it.enis.map(e => e.eni)))
      .without(all.vpcEndpoints.flatMap(it => it.enis))
      .without(all.loadBalancers.flatMap(it => it.enis))
      .without(all.ecsTasks.flatMap(it => it.enis))
      .without(all.rds.flatMap(it => it.enis))

    if (unknownEnis.length > 0) {
      console.log(newIndent)
      console.log(newIndent + `${unknownEnis.length} ENIs are unaccounted for in the above list:`.red.bold)
      renderEnis(
        newIndent,
        all.enis.filter(it => unknownEnis.includes(it.id)),
        all
      )
    }
  })
}

declare global {
  interface Array<T> {
    without(other: T[]): T[]
  }
}
Array.prototype.without = function <T>(this: T[], other: T[]): T[] {
  return [...this].filter(it => !other.includes(it))
}

function renderNatGateways(indent: string, gws: api.NatGatewayModel[], all: api.AllResources) {
  const newIndent = `${indent} ${'│'.grey}`
  gws.forEach(gw => {
    console.log(indent + '╲'.grey)

    console.log(`${newIndent} ${gw.id}${gw.name ? ` (${gw.name.green})` : ''}`)
    gw.enis.forEach(eni => {
      renderEnis(
        newIndent,
        all.enis.filter(it => it.id == eni.eni),
        all
      )
    })
  })
}

function renderEnis(indent: string, enis: api.EniModel[], all: api.AllResources) {
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

function ingressLineFromRule(rule: { port: string; from: string[] }): string {
  return `${'ALLOW'.green} from [${rule.from.join(', ').cyan}] to ${rule.port.cyan}`
}
function egressLineFromRule(rule: { port: string; to: string[] }): string {
  if (rule.to.length == 1 && rule.to.includes('255.255.255.255/32') && rule.port == '252-86') {
    return `${'DENY'.red} to [${'any address'.red}] to ${'any ports'.red}`
  } else {
    return `${'ALLOW'.green} to [${rule.to.join(', ').cyan}] to ${rule.port.cyan}`
  }
}

function renderSecGroups(indent: string, groups: api.SecGroupModel[]) {
  const firstLine = `${indent} ${'┐'.grey}`
  const newIndent = `${indent} ${'│'.grey}`
  groups.forEach(group => {
    const name = makeNamePair(group.name, group.description)
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
  endpoints: api.VpcEndpointModel[],
  subnetId: string | undefined,
  all: api.AllResources
) {
  const newIndent = `${indent} ${'│'.grey}`
  endpoints.forEach(endpoint => {
    console.log(indent + '╲'.grey)

    const state = endpoint.state == 'available' ? endpoint.state.green : endpoint.state.red
    console.log(`${newIndent} ${endpoint.id} (${endpoint.type}: ${endpoint.service.green}) - ${state}`)
    if (endpoint.type == 'Interface') console.log(`${newIndent}   Private DNS enabled: ${endpoint.privateDns}`)

    endpoint.enis.forEach(eni => {
      renderEnis(
        newIndent,
        all.enis.filter(it => it.id == eni && it.subnetId == subnetId),
        all
      )
    })
  })
}

function renderEcsTaskAttachments(indent: string, tasks: api.EcsTaskModel[], all: api.AllResources) {
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
      cont.enis.forEach(eni => {
        renderEnis(
          deepIndent,
          all.enis.filter(it => it.id == eni),
          all
        )
      })
    })
  })
}

function renderLoadBalancers(indent: string, lbs: api.LoadBalancerModel[], subnetId: string, all: api.AllResources) {
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

function renderRdsInstances(indent: string, dbs: api.RdsModel[], subnetId: string, all: api.AllResources) {
  const newIndent = `${indent} ${'│'.blue}`
  dbs.forEach(db => {
    console.log(indent + '╲'.blue)
    const name = makeNamePair(db.arn, db.logicalId)
    console.log(`${newIndent} RDS ${db.id}${name ? ` (${name})` : ''}`)
    renderEnis(
      newIndent,
      all.enis.filter(it => it.subnetId == subnetId && db.enis.includes(it.id)),
      all
    )
  })
}

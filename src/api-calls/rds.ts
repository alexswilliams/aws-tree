import { RDS } from 'aws-sdk'
import { allPagesThrowing, intersectionOf } from '../helper'
import type { EniModel } from './eni'
const rdsApi = new RDS()

export type RdsModel = {
  id: string
  arn: string
  logicalId: string | undefined
  vpcId: string
  subnets: string[]
  secGroups: string[]
  enis: string[]
}
export async function getAllRdsInstances(enis: EniModel[]): Promise<RdsModel[]> {
  const response = await allPagesThrowing(rdsApi.describeDBInstances(), (acc, next) => ({
    DBInstances: [...(acc.DBInstances ?? []), ...(next.DBInstances ?? [])],
  }))
  return (
    response.DBInstances?.map(db => {
      const subnets = db.DBSubnetGroup?.Subnets?.map(it => it.SubnetIdentifier ?? '?subnet') ?? []
      const secGroups =
        db.VpcSecurityGroups?.filter(it => it.Status == 'active')?.map(it => it.VpcSecurityGroupId ?? '?vpc') ?? []
      return {
        id: db.DBInstanceIdentifier ?? 'unknown-rds-instance',
        arn: db.DBInstanceArn ?? 'unknown-rds-instance',
        logicalId: db.TagList?.find(it => it.Key == 'aws:cloudformation:logical-id')?.Value,
        vpcId: db.DBSubnetGroup?.VpcId ?? '?vpc',
        subnets,
        secGroups,
        // TODO: This isn't a foolproof matching!  If you have many RDSs with the same security group assigned, you will get incorrect ENIs
        enis: enis
          .filter(
            eni =>
              eni.description == 'RDSNetworkInterface' &&
              eni.interfaceOwner == 'amazon-rds' &&
              subnets.includes(eni.subnetId) &&
              intersectionOf(eni.secGroups, secGroups).length > 0
          )
          .map(it => it.id),
      }
    }) ?? []
  )
}

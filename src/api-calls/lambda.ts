import { LambdaClient, paginateListFunctions } from '@aws-sdk/client-lambda'
import { combineAllPages } from '../helper'
import type { EniModel } from './eni'

const lambdaClient = new LambdaClient({})

export type LambdaModel = {
  id: string
  runtime: string | undefined
  memorySize: number | undefined
  vpcId: string
  subnetIds: string[]
  enis: string[]
}
export async function getAllLambdas(enis: EniModel[]): Promise<LambdaModel[]> {
  const response = await combineAllPages(
    paginateListFunctions({ client: lambdaClient }, { MaxItems: 50 }),
    it => it.Functions
  )
  return response
    .filter(lambda => lambda.VpcConfig)
    .map(lambda => ({
      id: lambda.FunctionName ?? 'unknown-lambda',
      runtime: lambda.Runtime,
      memorySize: lambda.MemorySize,
      vpcId: lambda.VpcConfig?.VpcId ?? '?vpc',
      subnetIds: lambda.VpcConfig?.SubnetIds ?? [],
      enis: enis
        .filter(
          eni =>
            eni.description?.includes('ENI-' + (lambda.FunctionName ?? 'xxxxx') + '-') &&
            (lambda.VpcConfig?.SubnetIds ?? []).includes(eni.subnetId)
        )
        .map(eni => eni.id),
    }))
}

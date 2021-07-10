import { ApiGatewayV2Client, GetVpcLinksCommand } from '@aws-sdk/client-apigatewayv2'
import type { EniModel } from './eni'
const client = new ApiGatewayV2Client({})

export type ApiGwVpcLinkModel = {
  id: string
  name: string | undefined
  status: string
  subnetIds: string[]
  enis: string[]
}
export async function getAllApiGwVpcLinks(enis: EniModel[]): Promise<ApiGwVpcLinkModel[]> {
  const vpcLinksResponse = await client.send(new GetVpcLinksCommand({}))
  return (
    vpcLinksResponse.Items?.map(link => ({
      id: link.VpcLinkId ?? 'unknown-apigw-vpclink',
      name: link.Name,
      status: link.VpcLinkStatus ?? 'UNKNOWN',
      subnetIds: link.SubnetIds ?? [],
      enis: enis
        .filter(eni => eni.interfaceType == 'api_gateway_managed' && eni.vpcLinkId == link.VpcLinkId)
        .map(it => it.id),
    })) ?? []
  )
}

import { KafkaClient, paginateListClusters, paginateListNodes } from '@aws-sdk/client-kafka'
import { combineAllPages } from '../helper'

const client = new KafkaClient({})

export type KafkaClusterModel = {
  arn: string
  name: string
  state: string
}
export type KafkaNodeModel = {
  id: string
  type: string
  instanceType: string
  cluster: KafkaClusterModel | undefined
  eni: string
}
export async function getAllKafkaNodes(): Promise<KafkaNodeModel[]> {
  const clusterResponse = await combineAllPages(paginateListClusters({ client }, {}), it => it.ClusterInfoList)
  const clusters: KafkaClusterModel[] = clusterResponse.map(cluster => ({
    arn: cluster.ClusterArn ?? 'unknown-kafka-cluster',
    name: cluster.ClusterName ?? 'unknown-kafka-cluster',
    state: cluster.State ?? 'UNKNOWN',
  }))

  const nodesPerCluster = await Promise.all(
    clusterResponse.map(cluster =>
      combineAllPages(paginateListNodes({ client }, { ClusterArn: cluster.ClusterArn }), it =>
        it.NodeInfoList?.map(ni => ({ clusterArn: cluster.ClusterArn, nodeInfo: ni }))
      )
    )
  )
  const allNodes = nodesPerCluster.flat(1)

  return allNodes.map(node => ({
    id: node.nodeInfo.NodeARN ?? 'unknown-kafka-node',
    type: node.nodeInfo.NodeType ?? 'UNKNOWN',
    instanceType: node.nodeInfo.InstanceType ?? 'unknown',
    cluster: clusters.find(cluster => cluster.arn == node.clusterArn),
    eni: node.nodeInfo.BrokerNodeInfo?.AttachedENIId ?? '?eni',
  }))
}

import { DescribeTasksCommand, ECSClient, paginateListClusters, paginateListTasks, Task } from '@aws-sdk/client-ecs'
import { combineAllPages } from '../helper'
const client = new ECSClient({})

export type EcsTaskModel = {
  arn: string
  connectivity: string
  subnetIds: string[]
  enis: string[]
  containers: {
    arn: string
    name: string | undefined
    status: string
    health: string
    enis: string[]
  }[]
}

export async function getAllEcsClusters(): Promise<string[]> {
  return combineAllPages(paginateListClusters({ client }, {}), it => it.clusterArns)
}
export async function getAllEcsTasks(clusterArns: string[]): Promise<EcsTaskModel[]> {
  const allTaskArnsPerCluster = await Promise.all(
    clusterArns.map(clusterArn =>
      combineAllPages(paginateListTasks({ client }, { cluster: clusterArn }), it =>
        it.taskArns?.map(taskArn => ({ clusterArn, taskArn }))
      )
    )
  )

  const allTasksPerCluster = await Promise.all(
    allTaskArnsPerCluster
      .filter(it => it.length > 0)
      .map(async clusterBatch => {
        const cluster = clusterBatch[0].clusterArn

        return client.send(new DescribeTasksCommand({ tasks: clusterBatch.map(it => it.taskArn), cluster }))
      })
  )
  const allTasks = allTasksPerCluster.flatMap(it => it.tasks).filter(it => it) as Task[]

  return allTasks.map(task => ({
    arn: task.taskArn ?? 'unknown-task',
    connectivity: task.connectivity ?? 'unknown',
    subnetIds: [
      ...new Set(
        task.attachments?.map(it => it.details?.find(detail => detail.name == 'subnetId')?.value ?? 'unknown-subnet')
      ),
    ],
    enis: [
      ...new Set(
        task.attachments?.map(
          it => it.details?.find(detail => detail.name == 'networkInterfaceId')?.value ?? 'unknown-eni'
        )
      ),
    ],
    containers:
      task.containers?.map(cont => ({
        arn: cont.containerArn ?? 'unknown-container',
        name: cont.name,
        status: cont.lastStatus ?? 'UNKNOWN',
        health: cont.healthStatus ?? 'UNKNOWN',
        enis:
          cont.networkInterfaces?.map(
            nif =>
              task.attachments
                ?.find(att => att.id == nif.attachmentId)
                ?.details?.find(it => it.name == 'networkInterfaceId')?.value ?? '?eni'
          ) ?? [],
      })) ?? [],
  }))
}

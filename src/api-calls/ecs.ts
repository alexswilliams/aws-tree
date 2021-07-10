import { ECS } from 'aws-sdk'
import { allPagesThrowing } from '../helper'
const ecsApi = new ECS()

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
  return (
    (
      await allPagesThrowing(ecsApi.listClusters(), (acc, next) => ({
        clusterArns: [...(acc.clusterArns ?? []), ...(next.clusterArns ?? [])],
      }))
    ).clusterArns ?? []
  )
}
export async function getAllEcsTasks(clusterArns: string[]): Promise<EcsTaskModel[]> {
  const taskDescriptionsPerCluster = await Promise.all(
    clusterArns.map(async clusterArn => {
      const taskArnResponse = await allPagesThrowing(ecsApi.listTasks({ cluster: clusterArn }), (acc, next) => ({
        taskArns: [...(acc.taskArns ?? []), ...(next.taskArns ?? [])],
      }))

      if ((taskArnResponse.taskArns ?? []).length == 0) return []

      const response = await allPagesThrowing(
        ecsApi.describeTasks({
          tasks: taskArnResponse.taskArns ?? [],
          cluster: clusterArn,
        }),
        (acc, next) => ({
          tasks: [...(acc.tasks ?? []), ...(next.tasks ?? [])],
        })
      )

      return response.tasks ?? []
    })
  )
  const allTasks = taskDescriptionsPerCluster.flat(1)

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

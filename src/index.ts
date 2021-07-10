import { getAllResources } from './api-calls'
import { renderVpcs } from './renderers'

export async function main(): Promise<void> {
  const all = await getAllResources()
  renderVpcs(all.vpcs, all)
}

// getAllEnis()
//   .then(enis => getAllLambdas(enis))
//   .then(lambdas => console.log(inspect(lambdas, false, null, true)))
main()

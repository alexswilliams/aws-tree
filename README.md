# AWS Tree Exporter

Visualise the network setup of an AWS account from the command line.

## How to run with Docker

The following script will invoke the latest version of aws-tree using the supplied `PROFILE` and `REGION` environment variables.

```bash
export PROFILE=...
export REGION=...

docker run \
  --rm -it \
  -v "${HOME}/.aws/credentials:/root/.aws/credentials:ro" \
  -e AWS_PROFILE=${PROFILE} \
  -e AWS_REGION=${REGION} \
  alexswilliams/aws-tree:latest
```

If you have this respository already checked out, you can run the following:

```bash
./run.sh ${PROFILE} ${REGION}
```

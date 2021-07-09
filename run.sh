#!/usr/bin/env bash

PROFILE=${1:-default}
REGION=${2:-eu-west-1}

docker run \
  --rm -it \
  -v "${HOME}/.aws/credentials:/root/.aws/credentials:ro" \
  -e AWS_PROFILE=${PROFILE} \
  -e AWS_REGION=${REGION} \
  alexswilliams/aws-tree:latest

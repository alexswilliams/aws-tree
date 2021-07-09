#!/usr/bin/env bash

PROFILE=${1:-default}

docker run \
  --rm -it \
  -v "${HOME}/.aws/credentials:/root/.aws/credentials:ro" \
  -e AWS_PROFILE=${PROFILE} \
  alexswilliams/aws-tree:latest

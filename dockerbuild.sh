#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

docker build -t acath/fs-service .
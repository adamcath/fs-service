#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

./precommit.sh

echo '##########################################'
echo '# Running integration tests'
echo '##########################################'

npm run intTest

echo '##########################################'
echo '# OK!'
echo '##########################################'
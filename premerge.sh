#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

echo '##########################################'
echo '# Setup'
echo '##########################################'

npm install

echo '##########################################'
echo '# Linting'
echo '##########################################'

npx eslint src test

echo '##########################################'
echo '# Vulnerability scan'
echo '##########################################'

npm audit --production

echo '##########################################'
echo '# Running unit tests'
echo '##########################################'

npm run unitTest

echo '##########################################'
echo '# Running integration tests'
echo '##########################################'

npm run intTest
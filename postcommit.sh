#!/usr/bin/env bash

./precommit.sh

echo '##########################################'
echo '# Running integration tests'
echo '##########################################'

npm run intTest

echo '##########################################'
echo '# OK!'
echo '##########################################'
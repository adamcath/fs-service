# fs-service

[![adamcath](https://circleci.com/gh/adamcath/fs-service.svg?style=svg)](https://app.circleci.com/pipelines/github/adamcath/fs-service?branch=master)

fs-service serves up files on the server's filesystem for easy access by REST clients.

## Getting started

Prerequisites:
- `docker`
- `bash`

Running:
1. `./dockerbuild.sh`: Builds a local docker image.
2. `docker run -d -p3000:3000 acath/fs-service`: Starts the service on port 3000.
   Of course you can use any external port you like.

Playing around:
```
$ curl localhost:3000
[
  ...
  {
    "name": "json_file",
    "owner": "root",
    "size": 16,
    "permissions": "644"
  },
  ...
  {
    "name": "nonempty_dir/",
    "owner": "root",
    "size": 4096,
    "permissions": "755"
  }
]
```
```
$ curl localhost:3000/json_file

{ "foo": "bar" }
```

## API Reference

A `GET` to any URL on this service will return some contents from the public directory configured for the service. 
The entire URL (after the host and port) is interpreted as a path relative to this directory.
If the path corresponds to a UTF-8 encoded file, you will get the contents of the file with `Content-Type: text/plain`.
If the path corresponds to a directory, you will get an a list of entries in the directory as JSON.

### Schema of a directory response 

A directory is represented as an array of entry objects. An entry object has:
- `name`: String representing the filename. Subdirectories end in `/`.
- `owner`: May be a string or a numeric UID, if the UID stored in the filesystem couldn't be resolved to a user.
- `size`: Number representing the file's size in bytes.
- `permissions`: String representing the file's permissions as 1-3 octal digits.

### Errors

If you get back a 4xx or 5xx, the body will be a JSON object with:
- `message`: The error message 

### Limitations

- Only regular files and directories are supported.
- There is no pagination, so enormous directories or files may create problems.
- If the public directory contains files not readable by the service.
- You may not escape from the public directory using `..`.

## Developers

Requirements:
- `node`
- `npm`
- Dev env has been tested on Mac OS 10.15.

`npm run` commands of note:
- `unitTest`: Fast tests with no dependencies.
- `intTest`: Stands up the real service and sends it real HTTP requests.
- `dev`: Starts the service under `nodemon` for rapid iteration.
- `start`: Starts the service like production.

Commands for the CI environment:
- `premerge.sh`: Lint, unit tests with coverage threshold, and vulnerability scan. CircleCI is set up to run this
  on every PR.
- `postmerge.sh`: Pre-merge tests plus integration tests. CI should run this shortly after each merge, and 
  ideally back out merges that break it.
  
The CI should generally run these against the dockerized app for reproducibility:
`docker run acath/fs-service ./premerge.sh`. This will exit non-zero if the tests fail, and emit useful logs to 
stdout.

Developers may want to do exactly what the CI does, or run the CI scripts outside 
of docker for speed.

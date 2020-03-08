# fs-service

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
- `premerge.sh`: Lint and unit tests. CI should not allow merges that fail this.
- `postmerge.sh`: Pre-merge tests plus integration tests. CI should run this shortly after each merge, and 
  ideally back out merges that break it.
  
The CI should generally run these against the dockerized app for reproducibility:
`docker run acath/fs-service ./premerge.sh`. This will exit non-zero if the tests fail, and emit useful logs to 
stdout.

Developers may want to do exactly what the CI does, or run the CI scripts outside 
of docker for speed.
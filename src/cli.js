const App = require('./app')

/**
 * Entry point to launch the fs-service, using these env vars:
 *
 * - PORT {Number} To start the server on.
 * - PUB_DIR {String} Path, absolute or relative to CWD, to serve files from.
 */
function cli () {
  const port = process.env.PORT || 3000

  const pubDir = process.env.PUB_DIR
  if (!pubDir) {
    throw new Error('You must specify PUB_DIR')
  }

  new App(pubDir).listen(port)
}

cli()

const express = require('express')
const HttpFs = require('./httpFs')

/**
 * An Express web server that serves all GETs to any URL by delegating to {@link HttpFs}.
 *
 * Construction has no side-effects. To serve traffic call {@link listen()}.
 */
class App {
  /**
   * @param pubDir {string} Path to the public directory to be shared. May be absolute or relative to CWD.
   */
  constructor (pubDir) {
    this.app = express()

    const httpFs = new HttpFs(pubDir)

    this.app.get(/.*/, async (req, res) => {
      let node
      try {
        node = await httpFs.getNode(req.url)
      } catch (e) {
        return res.status(e.httpStatus).send(e)
      }
      if (node.isDir()) {
        try {
          return res.send(await node.list())
        } catch (e) {
          return res.status(e.httpStatus).send(e)
        }
      } else if (node.isFile()) {
        try {
          const contents = await node.readCompletely()
          return res.type('text').send(contents)
        } catch (e) {
          return res.status(e.httpStatus).send(e)
        }
      }
      throw new Error('getNode returned unknown type')
    })
  }

  /**
   * @param port {Number} To start serving traffic on.
   */
  listen (port) {
    this.app.listen(port, () => {
      console.log('fs-service started on port ' + port)
    })
  }
}

module.exports = App

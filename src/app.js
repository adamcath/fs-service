const express = require('express')
const HttpFs = require('./httpFs')

class App {
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

      // TODO else?
    })
  }

  listen (port) {
    this.app.listen(port, () => {
      console.log('fs-service started on port ' + port)
    })
  }
}

module.exports = App

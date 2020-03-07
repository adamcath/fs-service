const express = require('express')
const HttpFs = require('./httpFs')
const app = express()

const pubDir = process.env.PUB_DIR
if (!pubDir) {
    throw new Error('You must specify PUB_DIR')
}
const httpFs = new HttpFs(pubDir)

const port = process.env.PORT || 3000

app.get(/.*/, async (req, res) => {
    const node = await httpFs.getNode(req.url)
    if (!node) {
        // TODO collapse into HttpFsError?
        return res.status(404).send({error: 'Path not found within public directory'})
    }
    if (node.isDir()) {
        try {
            return res.send(await node.list())
        } catch (e) {
            return res.status(e.httpStatus).send(e)
        }
    } else if (node.isFile()) {
        try {
            const contents = await node.readCompletely();
            return res.type('text').send(contents)
        } catch (e) {
            return res.status(e.httpStatus).send(e)
        }
    }

    // TODO else?
})

app.listen(port, () => {
    console.log('fs-service started on port ' + port)
})

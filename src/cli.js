const App = require('./app')

const port = process.env.PORT || 3000

const pubDir = process.env.PUB_DIR
if (!pubDir) {
    throw new Error('You must specify PUB_DIR')
}

new App(pubDir).listen(port)
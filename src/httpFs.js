const fs = require('fs')
const path = require('path')
const posix = require('posix')

class HttpFs {

    constructor(root) {
        this.root = root

        if (!fs.statSync(root).isDirectory()) {
            throw new Error('PUB_DIR is not a directory')
        }
    }

    async getNode(urlPath) {

        // TODO Convert urlPath to a real path

        if (this.relPathEscapes(urlPath)) {
            throw new HttpFsError(401, 'Paths with .. segments are not permitted: ' + urlPath)
        }

        const fullPath = path.join(this.root, urlPath)

        try {
            const stats = await fs.promises.stat(fullPath)
            if (stats.isDirectory()) {
                return new DirNode(fullPath)
            } else if (stats.isFile()) {
                return new FileNode(fullPath)
            } else if (stats) {
            } else {
                // TODO handle this
            }
        } catch (e) {
            if (e.code === 'ENOENT') {
                throw new HttpFsError(404, 'Not found: ' + urlPath)
            }
            throw new HttpFsError(500, e.message)
        }
    }

    relPathEscapes(relPath) {
        /*
         Protect against the requester escaping from pubDir. We could do this in a more precise way that allows
         for ../ segments in the path, or that allows for filenames like foo..bar.txt, but unless there's a
         compelling reason to do so, it's better to be more conservative with questionable user input.
        */
        return relPath.indexOf('..') >= 0
    }
}

class HttpFsError {
    constructor(httpStatus, message) {
        this.httpStatus = httpStatus
        this.message = message
    }

    toJSON() {
        return {message: this.message}
    }
}

class DirNode {

    constructor(path) {
        this.path = path
    }

    isDir() {
        return true
    }

    isFile() {
        return false
    }

    async list() {
        let files
        try {
            files = await fs.promises.readdir(this.path)
        } catch (e) {
            // TODO
        }

        const dirents = []
        for (const name of files) {
            try {
                const stats = await fs.promises.stat(path.join(this.path, name))

                const displayName = stats.isDirectory() ? name + '/' : name
                const displayPerms = (stats.mode % 0o1000).toString(8)
                const displayOwner = this.uidToName(stats.uid);

                dirents.push(new Dirent(displayName, displayOwner, stats.size, displayPerms))
            } catch (e) {
                // TODO
            }
        }

        return dirents
    }

    uidToName(uid) {
        const record = posix.getpwnam(uid)
        return record.name || uid
    }
}

class Dirent {

    constructor(name, owner, size, permissions) {
        this.name = name;
        this.owner = owner;
        this.size = size;
        this.permissions = permissions;
    }
}

class FileNode {

    constructor(path) {
        this.path = path
    }

    isDir() {
        return false
    }

    isFile() {
        return true
    }

    async readCompletely() {
        try {
            return await fs.promises.readFile(this.path, 'UTF-8')
        } catch (e) {
            // TODO handle this
        }
    }
}

module.exports = HttpFs
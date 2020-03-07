const fs = require('fs')
const path = require('path')
const posix = require('posix')

class HttpFs {
    root;

    constructor(root) {
        this.root = root

        if (!fs.statSync(root).isDirectory()) {
            throw new Error('PUB_DIR is not a directory')
        }
    }

    async getNode(urlPath) {
        // TODO Ensure path doesn't escape from root
        // TODO Convert urlPath to a real path
        const fullPath = path.join(this.root, urlPath)

        try {
            const stats = await fs.promises.stat(fullPath)
            if (stats.isDirectory()) {
                return new DirNode(fullPath)
            } else if (stats.isFile()) {
                return new FileNode(fullPath)
            } else {
                // TODO handle this
            }
        } catch (e) {
            // TODO handle this
        }
    }
}

class HttpFsError {
    httpStatus;
}

class DirNode {
    path;

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
    name;
    owner;
    size;
    permissions;

    constructor(name, owner, size, permissions) {
        this.name = name;
        this.owner = owner;
        this.size = size;
        this.permissions = permissions;
    }
}

class FileNode {
    path;

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
const fs = require('fs')
const path = require('path')
const posix = require('posix')

class HttpFs {
  constructor (root) {
    this.root = root

    if (!fs.statSync(root).isDirectory()) {
      throw new Error('PUB_DIR is not a directory')
    }
  }

  async getNode (urlPath) {
    if (!this.isRelPathValid(urlPath)) {
      throw new HttpFsError(403, 'Paths with .. segments are not permitted: ' + urlPath)
    }

    const fullPath = path.join(this.root, urlPath)

    let stats
    try {
      stats = await fs.promises.stat(fullPath)
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new HttpFsError(404, 'Not found: ' + urlPath)
      }
      throw new HttpFsError(500, e.message)
    }

    if (stats.isDirectory()) {
      return new DirNode(fullPath)
    } else if (stats.isFile()) {
      return new FileNode(fullPath)
    } else {
      throw new HttpFsError(403, 'Special files are not supported: ' + urlPath)
    }
  }

  isRelPathValid (relPath) {
    /*
     Do not provide answers for files outside of pubDir. We could do this in a more precise way that allows
     for ../ segments in the path, or that allows for filenames like foo..bar.txt, but unless there's a
     compelling reason to do so, it's better to be more conservative with questionable user input.
    */
    return relPath.indexOf('..') < 0
  }
}

class HttpFsError {
  constructor (httpStatus, message) {
    this.httpStatus = httpStatus
    this.message = message
  }

  toJSON () {
    return { message: this.message }
  }
}

class DirNode {
  constructor (path) {
    this.path = path
  }

  isDir () {
    return true
  }

  isFile () {
    return false
  }

  async list () {
    let files
    try {
      files = await fs.promises.readdir(this.path)
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new HttpFsError(404, 'Not found: ' + this.path)
      }
      throw new HttpFsError(500, e.message)
    }
    files.sort()

    const dirents = []
    for (const name of files) {
      const dirent = await this.buildDirent(name)
      if (dirent) {
        dirents.push(dirent)
      }
    }

    return dirents
  }

  async buildDirent (name) {
    try {
      const stats = await fs.promises.stat(path.join(this.path, name))

      const displayName = stats.isDirectory() ? name + '/' : name
      const displayPerms = this.modeIntToDisplayStr(stats.mode)
      const displayOwner = this.uidToName(stats.uid)

      return new Dirent(displayName, displayOwner, stats.size, displayPerms)
    } catch (e) {
      if (e.code === 'ENOENT') {
        /*
         This is a rather subtle race condition. Other processes may be modifying the filesystem while we
         are servicing a request. In this case, a file existed a moment ago when we called readdir(), but has
         since been deleted. So it's meaningless to try to construct a dirent for that file.
         */
        return null
      }
      throw new HttpFsError(500, e.message)
    }
  }

  modeIntToDisplayStr (mode) {
    return (mode % 0o1000).toString(8)
  }

  uidToName (uid) {
    try {
      const record = posix.getpwnam(uid)
      return record.name || uid
    } catch (e) {
      return uid
    }
  }
}

class Dirent {
  constructor (name, owner, size, permissions) {
    this.name = name
    this.owner = owner
    this.size = size
    this.permissions = permissions
  }
}

class FileNode {
  constructor (path) {
    this.path = path
  }

  isDir () {
    return false
  }

  isFile () {
    return true
  }

  async readCompletely () {
    try {
      return await fs.promises.readFile(this.path, 'UTF-8')
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new HttpFsError(404, 'Not found: ' + this.path)
      }
      throw new HttpFsError(500, e.message)
    }
  }
}

HttpFs._exportsForTest = { DirNode, Dirent, FileNode }

module.exports = HttpFs

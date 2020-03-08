const fs = require('fs')
const path = require('path')
const posix = require('posix')

/**
 * Maps the filesystem to RESTy data structures.
 *
 * To use it, construct one with a root directory, and then later call {@link getNode()} with a path relative to the
 * root dir. This will either fail or give you a {@link DirNode} or {@link FileNode} which you can use to get more
 * details.
 *
 * Many of the methods throw {@link HttpFsError}, which includes an HTTP status code you can use in a response.
 */
class HttpFs {
  /**
   * Initializes HttpFs with a root directory. Throws if root isn't an existing directory.
   */
  constructor (root) {
    this.root = root

    if (!fs.statSync(root).isDirectory()) {
      throw new Error('PUB_DIR is not a directory')
    }
  }

  /**
   * @param relPath {String} to a file or directory inside the root dir.
   * @returns {Promise<DirNode|FileNode>} representing the file or directory requested.
   * @throws {HttpFsError} if the node doesn't exist, can't be stat'ed, etc.
   */
  async getNode (relPath) {
    if (!this.isRelPathValid(relPath)) {
      throw new HttpFsError(403, 'Paths with .. segments are not permitted: ' + relPath)
    }

    const fullPath = path.join(this.root, relPath)
    let stats
    try {
      stats = await fs.promises.stat(fullPath)
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new HttpFsError(404, 'Not found: ' + relPath)
      }
      throw new HttpFsError(500, e.message)
    }

    if (stats.isDirectory()) {
      return new DirNode(fullPath)
    } else if (stats.isFile()) {
      return new FileNode(fullPath)
    } else {
      throw new HttpFsError(403, 'Special files are not supported: ' + relPath)
    }
  }

  /**
   * Ensures we do not leak info about files outside of root. We could do this in a more precise way that allows
   * for ../ segments in the path, or that allows for filenames like foo..bar.txt, but unless there's a
   * compelling reason to do so, it's better to be more conservative with questionable user input.
   *
   * @param relPath {String} From a client. Should be considered tainted.
   * @return {boolean} Whether the path is acceptable.
   */
  isRelPathValid (relPath) {
    return relPath.indexOf('..') < 0
  }
}

/**
 * Includes an status code to be used in an HTTP response.
 */
class HttpFsError {
  constructor (httpStatus, message) {
    this.httpStatus = httpStatus
    this.message = message
  }

  toJSON () {
    // When turning this into a response body, httpStatus is redundant, since it has its own field in HTTP
    return { message: this.message }
  }
}

/**
 * RESTy wrapper for a directory on disk.
 */
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

  /**
   * @return {Promise<[DirentNode]>} List of entries in this dir.
   * @throws {HttpFsError}
   */
  async list () {
    let files
    try {
      files = await fs.promises.readdir(this.path)
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new HttpFsError(404, 'Not found: ' + this.path)
      }
      if (e.code === 'EPERM' || e.code === 'EACCES') {
        throw new HttpFsError(403, 'Not permitted to read: ' + this.path)
      }
      throw new HttpFsError(500, e.message)
    }

    // We sort for portability, since different OSs may sort differently
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

  /**
   * @param name Of a file in this dir.
   * @return {Promise<null|DirentNode>} Null if the entry should be omitted from the listing.
   * @throws {HttpFsError}
   */
  async buildDirent (name) {
    let stats
    try {
      stats = await fs.promises.stat(path.join(this.path, name))
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

    return new DirentNode(
      stats.isDirectory() ? name + '/' : name,
      this.uidToName(stats.uid),
      stats.size,
      this.modeIntToDisplayStr(stats.mode))
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

/**
 * RESTy wrapper for a directory entry on disk.
 */
class DirentNode {
  constructor (name, owner, size, permissions) {
    this.name = name
    this.owner = owner
    this.size = size
    this.permissions = permissions
  }
}

/**
 * RESTy wrapper for a file on disk.
 */
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

  /**
   * @return {Promise<string>} The file's contents.
   * @throws {HttpFsError} If reading fails, or the file is not UTF-8 encoded.
   */
  async readCompletely () {
    try {
      return await fs.promises.readFile(this.path, 'UTF-8')
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new HttpFsError(404, 'Not found: ' + this.path)
      }
      if (e.code === 'EPERM' || e.code === 'EACCES') {
        throw new HttpFsError(403, 'Not permitted to read: ' + this.path)
      }
      throw new HttpFsError(500, e.message)
    }
  }
}

HttpFs._exportsForTest = { DirNode, DirentNode, FileNode }

module.exports = HttpFs

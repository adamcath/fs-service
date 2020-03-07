const HttpFs = require('../../src/httpFs')
jest.mock('fs')
jest.mock('posix')
const fs = require('fs')
const posix = require('posix')

describe('Initialize', () => {

    test('OK pubDir', () => {
        fs.statSync = jest.fn(path => ({
            isDirectory: () => true
        }))

        new HttpFs('okRootDir')
    })

    test('Bogus pubDir', () => {
        fs.statSync = jest.fn(path => ({
            isDirectory: () => false
        }))

        let thrownError
        try {
            new HttpFs('bogusRootDir')
        } catch (e) {
            thrownError = e
        }

        expect(thrownError).toMatchObject({
            message: 'PUB_DIR is not a directory'
        })
    })
})

describe('getNode', () => {

    let httpFs

    beforeEach(() => {
        fs.statSync = jest.fn(path => ({
            isDirectory: () => true
        }))
        fs.promises = {}

        httpFs = new HttpFs('pubDir')
    })

    test('should fail with .. segments', async () => {
        let thrownError
        try {
            await httpFs.getNode('..')
        } catch (e) {
            thrownError = e
        }
        expect(thrownError).toMatchObject({
            httpStatus: 403,
            message: 'Paths with .. segments are not permitted: ..'
        })
    })

    test('should 404 with a non-existent file', async () => {
        fs.promises.stat = jest.fn().mockRejectedValue({code: 'ENOENT'})

        let thrownError
        try {
            await httpFs.getNode('file')
        } catch (e) {
            thrownError = e
        }

        expect(thrownError).toMatchObject({
            httpStatus: 404,
            message: 'Not found: file'
        })
    })

    test('should 403 with a special file', async () => {
        fs.promises.stat = jest.fn().mockResolvedValue({
            isDirectory: () => false,
            isFile: () => false
        })

        let thrownError
        try {
            await httpFs.getNode('file')
        } catch (e) {
            thrownError = e
        }

        expect(thrownError).toMatchObject({
            httpStatus: 403,
            message: 'Special files are not supported: file'
        })
    })

    test('should 500 if stat fails otherwise', async () => {
        fs.promises.stat = jest.fn().mockRejectedValue(new Error('fake stat failure'))

        let thrownError
        try {
            await httpFs.getNode('file')
        } catch (e) {
            thrownError = e
        }

        expect(thrownError).toMatchObject({
            httpStatus: 500,
            message: 'fake stat failure'
        })
    })

    test('should return FileNode with a regular file', async () => {
        fs.promises.stat = jest.fn().mockResolvedValue({
            isDirectory: () => false,
            isFile: () => true
        })

        const node = await httpFs.getNode('file');
        expect(node.isFile()).toEqual(true)
        expect(node.path).toEqual('pubDir/file')
    })

    test('should return a DirNode with a regular dir', async () => {
        fs.promises.stat = jest.fn().mockResolvedValue({
            isDirectory: () => true,
            isFile: () => false
        })

        const node = await httpFs.getNode('dir');
        expect(node.isDir()).toEqual(true)
        expect(node.path).toEqual('pubDir/dir')
    })
})

describe('DirNode', () => {

    describe('list', () => {

        let dirNode

        beforeEach(() => {
            fs.promises = {}

            dirNode = new HttpFs._exportsForTest.DirNode('path')
        })

        const file1Stats = {
            isDirectory: () => false,
            isFile: () => true,
            uid: -1,
            size: 1,
            mode: 0o777
        };
        const dir1Stats = {
            isDirectory: () => true,
            isFile: () => false,
            uid: -1,
            size: 2,
            mode: 0o10
        };

        const file1Dirent = {
            name: 'file1',
            owner: -1,
            size: 1,
            permissions: '777'
        };
        const dir1Dirent = {
            name: 'dir1/',
            owner: -1,
            size: 2,
            permissions: '10'
        };

        test('should 404 if readdir fails with ENOENT', async () => {
            fs.promises.readdir = jest.fn().mockRejectedValue({code: 'ENOENT'})

            let thrownError
            try {
                await dirNode.list()
            } catch (e) {
                thrownError = e
            }

            expect(thrownError).toMatchObject({
                httpStatus: 404,
                message: 'Not found: path'
            })
        })

        test('should 500 if readdir fails otherwise', async () => {
            fs.promises.readdir = jest.fn().mockRejectedValue({code: 'UNKNOWN', message: 'readdir: fail'})

            let thrownError
            try {
                await dirNode.list()
            } catch (e) {
                thrownError = e
            }

            expect(thrownError).toMatchObject({
                httpStatus: 500,
                message: 'readdir: fail'
            })
        })

        test('should return empty if readdir does', async () => {
            fs.promises.readdir = jest.fn().mockResolvedValue([])

            expect(await dirNode.list()).toEqual([])
        })

        test('should return dirents matching readdir', async () => {
            fs.promises.readdir = jest.fn()
                .mockResolvedValue(['file1', 'dir1'])
            fs.promises.stat = jest.fn()
                .mockResolvedValueOnce(file1Stats)
                .mockResolvedValueOnce(dir1Stats)

            expect(await dirNode.list()).toMatchObject([file1Dirent, dir1Dirent])
        })

        test('should omit files removed between readdir and stat', async () => {
            fs.promises.readdir = jest.fn()
                .mockResolvedValue(['file1', 'raceFile', 'dir1'])
            fs.promises.stat = jest.fn()
                .mockResolvedValueOnce(file1Stats)
                .mockRejectedValueOnce({code: 'ENOENT', message: 'Not found'})
                .mockResolvedValueOnce(dir1Stats)

            expect(await dirNode.list()).toMatchObject([file1Dirent, dir1Dirent])
        })

        test('should 500 if file stat fails otherwise', async () => {
            fs.promises.readdir = jest.fn().mockResolvedValue(['file1'])
            fs.promises.stat = jest.fn().mockRejectedValue({code: 'UNKNOWN', message: 'Stat failed'})

            let thrownError
            try {
                await dirNode.list()
            } catch (e) {
                thrownError = e
            }

            expect(thrownError).toMatchObject({
                httpStatus: 500,
                message: 'Stat failed'
            })
        })
    })

    test('modeIntToDisplayStr', () => {
        const dirNode = new HttpFs._exportsForTest.DirNode('path');
        expect(dirNode.modeIntToDisplayStr(0o777)).toEqual('777')
        expect(dirNode.modeIntToDisplayStr(0o1)).toEqual('1')
        expect(dirNode.modeIntToDisplayStr(0o10644)).toEqual('644')
        expect(dirNode.modeIntToDisplayStr(0)).toEqual('0')
    })

    describe('uidToName', () => {

        const dirNode = new HttpFs._exportsForTest.DirNode('path');

        test('should return uname if getpwnam works', () => {
            posix.getpwnam = jest.fn().mockReturnValue({name: 'user'})
            expect(dirNode.uidToName(1)).toEqual('user')
        })

        test('should return uid if getpwnam throws', () => {
            posix.getpwnam = jest.fn().mockRejectedValue({message: 'getpwnam failed'})
            expect(dirNode.uidToName(1)).toEqual(1)
        })

        test('should return uid if getpwnam doesnt include name', () => {
            posix.getpwnam = jest.fn().mockReturnValue({})
            expect(dirNode.uidToName(1)).toEqual(1)
        })

        test('should return uid if getpwnam includes empty name', () => {
            posix.getpwnam = jest.fn().mockReturnValue({name: ''})
            expect(dirNode.uidToName(1)).toEqual(1)
        })
    })
})

describe('FileNode', () => {

    describe('readCompletely', () => {

        let fileNode

        beforeEach(() => {
            fs.promises = {}
            fileNode = new HttpFs._exportsForTest.FileNode('path')
        })

        test('happy file', async () => {
            fs.promises.readFile = jest.fn().mockReturnValue('contents')
            expect(await fileNode.readCompletely()).toEqual('contents')
        })

        test('should 404 if readFile fails with ENOENT', async () => {
            fs.promises.readFile = jest.fn().mockRejectedValue({code: 'ENOENT'})

            let thrownError
            try {
                await fileNode.readCompletely()
            } catch (e) {
                thrownError = e
            }

            expect(thrownError).toMatchObject({
                httpStatus: 404,
                message: 'Not found: path'
            })
        })

        test('should 500 if readFile fails otherwise', async () => {
            fs.promises.readFile = jest.fn().mockRejectedValue({code: 'UNKNOWN', message: 'read failed'})

            let thrownError
            try {
                await fileNode.readCompletely()
            } catch (e) {
                thrownError = e
            }

            expect(thrownError).toMatchObject({
                httpStatus: 500,
                message: 'read failed'
            })
        })
    })
})
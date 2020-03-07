jest.unmock('posix')
const request = require('supertest')
const App = require('../../src/app')

const app = new App('./test/integration/pub').app

test('GET /', async () => {
  await request(app)
    .get('/')
    .send()
    .expect(200)
    .then((res) => {
      expect(res.body).toMatchObject(
        [
          { name: 'empty_dir/', owner: expect.any(String), size: 64, permissions: '755' },
          { name: 'empty_file', owner: expect.any(String), size: 0, permissions: '644' },
          { name: 'json_file', owner: expect.any(String), size: 16, permissions: '644' },
          { name: 'non_json_file', owner: expect.any(String), size: 8, permissions: '644' },
          { name: 'nonempty_dir/', owner: expect.any(String), size: 160, permissions: '755' }
        ]
      )
    })
})

test('GET /empty_dir', async () => {
  await request(app)
    .get('/empty_dir')
    .send()
    .expect(200)
    .then((res) => {
      expect(res.body).toMatchObject(
        []
      )
    })
})

test('GET /nonempty_dir', async () => {
  await request(app)
    .get('/nonempty_dir')
    .send()
    .expect(200)
    .then((res) => {
      expect(res.body).toMatchObject(
        [
          { name: '.hidden', owner: expect.any(String), size: 15, permissions: '644' },
          { name: 'deeply_nested_dir/', owner: expect.any(String), size: 96, permissions: '755' },
          { name: 'file1', owner: expect.any(String), size: 14, permissions: '644' }
        ]
      )
    })
})

test('GET /nonempty_dir/deeply_nested_dir', async () => {
  await request(app)
    .get('/nonempty_dir/deeply_nested_dir')
    .send()
    .expect(200)
    .then((res) => {
      expect(res.body).toMatchObject(
        [
          { name: 'deeply_nested_file', owner: expect.any(String), permissions: '644', size: 11 }
        ]
      )
    })
})

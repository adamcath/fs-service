const request = require('supertest')
const App = require('../../src/app')

const app = new App('./test/integration/pub').app

test('GET /empty_file', async () => {
    await request(app)
        .get('/empty_file')
        .send()
        .expect(200)
        .then((res) => {
            expect(res.text).toEqual("")
        })
})

test('GET /json_file', async () => {
    await request(app)
        .get('/json_file')
        .send()
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .then((res) => {
            expect(res.text).toEqual('{ "foo": "bar" }')
        })
})

test('GET /non_json_file', async () => {
    await request(app)
        .get('/non_json_file')
        .send()
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .then((res) => {
            expect(res.text).toEqual('not json')
        })
})

test('GET /nonempty_dir/.hidden', async () => {
    await request(app)
        .get('/nonempty_dir/.hidden')
        .send()
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .then((res) => {
            expect(res.text).toEqual('hidden contents')
        })
})

test('GET /nonempty_dir/deeply_nested_dir/deeply_nested_file', async () => {
    await request(app)
        .get('/nonempty_dir/deeply_nested_dir/deeply_nested_file')
        .send()
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .then((res) => {
            expect(res.text).toEqual('very nested')
        })
})

test('GET /non_existant_file', async () => {
    await request(app)
        .get('/non_existant_file')
        .expect(404)
        .then((res) => {
            expect(res.body.message)
                .toEqual('Not found: /non_existant_file')
        })
})

test('GET with .. may not escape pub dir', async () => {
    await request(app)
        .get('/../out_of_scope_file')
        .expect(403)
        .then((res) => {
            expect(res.body.message)
                .toEqual('Paths with .. segments are not permitted: /../out_of_scope_file')
        })
})

test('GET with .. is rejected even if it doesnt escape', async () => {
    await request(app)
        .get('/nonempty_dir/../non_json_file')
        .expect(403)
        .then((res) => {
            expect(res.body.message)
                .toEqual('Paths with .. segments are not permitted: /nonempty_dir/../non_json_file')
        })
})
/* global TEST_BEHAVIOUR */
/* global BLOCK_EXIT */
const http = require('http')

process.on('SIGINT', () => {
    console.log('node process received SIGINT')
    if (!BLOCK_EXIT) {
        process.exit(128 + 2)
    }
})
process.on('SIGTERM', () => {
    console.log('node process received SIGTERM')
    if (!BLOCK_EXIT) {
        process.exit(128 + 15)
    }
})

switch (TEST_BEHAVIOUR) {
    case 'keep-alive': {
        const port = 3000
        
        const server = http.createServer((request, response) => {
            response.end()
        })
        
        server.listen(port, (err) => {
            if (err) {
                console.log('server failed to start', err)
                process.exit(1)
            } else {
                console.log(`server started on localhost:${port}`)
            }
        })
        break
    }
    case 'close':
        console.log('closing in 2 seconds')
        setTimeout(function() {
            console.log('closing')
        }, 2000)
        break
    case 'crash':
        console.log('crashing in 2 seconds')
        setTimeout(function() {
            throw new Error('Uncaught test error')
        }, 2000)
        break
}

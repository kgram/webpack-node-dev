const nodeDev = require('../index')
const webpack = require('webpack')

nodeDev({
    entry: './test-cases/entrypoint',
    output: {
        path: 'dist',
        filename: 'server.js',
    },
    target: 'node',
    plugins: [
        new webpack.DefinePlugin({
            TEST_BEHAVIOUR: '"close"',
            BLOCK_EXIT: 'false',
        }),
    ],
})

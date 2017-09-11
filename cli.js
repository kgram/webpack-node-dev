#!/usr/bin/env node

const path = require('path')

const yargs = require('yargs')
const { yellow } = require('chalk')

const nodeDev = require('./index')

const args = yargs
    .option('config', {
        alias: 'c',
        default: 'webpack.config.js',
        description: 'The path to the webpack config file',
    })
    .help()
    .argv

let config
try {
    config = require(path.resolve(args.config))
} catch (error) {
    console.error(`Could not resolve webpack config file ${args.config}`)
    process.exit(1)
}


console.log(yellow('============================================'))
console.log(yellow(`Starting development process`))
console.log(yellow('============================================'))
console.log(yellow('Enter commands: restart, debug, normal'))

nodeDev(config)

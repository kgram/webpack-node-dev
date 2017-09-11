#!/usr/bin/env node

const path = require('path')

const yargs = require('yargs')
const { magenta, yellow } = require('chalk')

const nodeDev = require('./index')

const args = yargs
    .option('config', {
        alias: 'c',
        default: 'webpack.config.js',
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


console.log(magenta('============================================'))
console.log(magenta(`Starting development process`))
console.log(magenta('============================================'))
console.log(yellow('Enter commands: restart, debug, normal'))

nodeDev(config)

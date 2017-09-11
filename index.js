const webpack = require('webpack')
const childProcess = require('child_process')
const { supportsColor, yellow, red } = require('chalk')

const defaultConfig = {
    // Called every time the server process is started
    onStart: () => {},
    // Defer the onStart event until the first write to stdout
    // This is useful for server first outputting when the server is ready
    waitForOutput: false,
    // Called every time the server closes. Takes one argument, 'kill', 'clean'
    // or 'crash' depending on the circumstances
    onClose: () => {},
    // Handle input
    // Receives a trimmed input string, server-options from last start and the
    // start/restart function.
    // Default restarts on 'restart' and toggles debug on/off on
    // 'debug'/'normal'
    onInput: (input, startServer) => {
        switch (input) {
            case 'rs':
            case 'restart':
                startServer()
                break
            case 'debug':
                startServer({ debug: true })
                break
            case 'normal':
                startServer({ debug: false })
                break
        }
    },
    // Handle webpack compile
    // Receives error/stats from webpack, server-options from last start  and
    // the start/restart function
    onCompile: (error, stats, startServer) => {
        if (error) {
            console.log(red('Webpack compilation error'), error)
        } else if (stats.hasErrors()) {
            console.log(red('Node compilation error'))
            console.log(stats.toString({
                chunks: false,
                colors: true,
            }))
        } else {
            console.log(magenta('Node compiled'))
            console.log(stats.toString({
                chunks: false,
                colors: true,
            }))
            // Restart server
            startServer()
        }
    },
    // Default options passed to server start. Useful if using additional flags
    // for env-variables
    defaultStartupOptions: { debug: false },
    // Get additional environment variables from server-options
    getEnvironment: () => ({}),
    // Entry script. Defaults to webpackConfig.output.filename
    entrypoint: null,
    // Current working directory. Defaults to webpackConfig.output.path
    cwd: null,
    // How long to wait after SIGINT until sending SIGTERM to the server process
    // Set to 0 to send SIGTERM immediately instead of SIGINT
    // Set to null to disable
    terminationDelay: 2000,
}

module.exports = (webpackConfig, nodeDevConfig) => {
    const {
        onStart,
        waitForOutput,
        onClose,
        onInput,
        onCompile,
        defaultStartupOptions,
        getEnvironment,
        entrypoint,
        cwd,
        terminationDelay,
    } = Object.assign({}, defaultConfig, {
        entrypoint: webpackConfig.output.filename,
        cwd: webpackConfig.output.path,
    }, webpackConfig.nodeDev, nodeDevConfig)

    let serverProcess = null
    let killPromise = null
    let startupOptions = defaultStartupOptions

    webpack(webpackConfig)
        .watch({}, (error, stats) => {
            onCompile(error, stats, startServer, startupOptions)
        })

    var stdin = process.openStdin()

    stdin.addListener('data', (chunk) => {
        const input = chunk.toString().trim()
        onInput(input, startServer, startupOptions)
    })

    const initServer = (options) => {
        startupOptions = Object.assign({}, startupOptions, options)
        serverProcess = childProcess.spawn(
            'node',
            startupOptions.debug ? ['--inspect', entrypoint] : [entrypoint],
            {
                cwd,
                // Clone environment
                env: Object.assign({}, process.env, {
                    // Force chalk to register the child process with the same color properties
                    // Any value passed enables force-color
                    FORCE_COLOR: supportsColor ? 'true' : undefined,
                }, getEnvironment(startupOptions)),
                // Do not inherit stdout, this is used to check when server is ready
                stdio: [process.stdin, 'pipe', process.stderr],
            }
        )
        let hasOutput = false
        serverProcess.stdout.addListener('data', (chunk) => {
            if (waitForOutput && !hasOutput) {
                onStart(startServer, startupOptions)
                hasOutput = true
            }
            process.stdout.write(chunk)
        })
        if (!waitForOutput) {
            onStart(startServer, startupOptions)
        }

        serverProcess.on('close', (code) => {
            if (killPromise) {
                console.log(yellow('Server restarted..'))
                onClose('kill', startServer, startupOptions)
            } else if (code === 0) {
                console.log(yellow('Server exited cleanly, restarts on new compilation'))
                onClose('clean', startServer, startupOptions)
            } else {
                console.log(red('Server crashed, restarts on new compilation'))
                onClose('crash', startServer, startupOptions)
            }

            serverProcess = null
            killPromise = null
        })
    }

    const startServer = (options) => {
        if (!serverProcess && !killPromise) {
            process.nextTick(() => initServer(options))
        } else if (!killPromise) {
            killServer().then(() => initServer(options))
        }
    }

    const killServer = () => {
        if (!serverProcess) {
            throw new Error('Server process not running, cannot kill')
        }
        if (killPromise) {
            return killPromise
        }
        killPromise = new Promise((resolve) => {
            let killTimeout = null
            if (terminationDelay) {
                // Send SIGTERM after timeout
                killTimeout = setTimeout(() => {
                    killTimeout = null
                    serverProcess.kill('SIGTERM')
                }, 2000)
            }
            serverProcess.on('close', () => {
                if (killTimeout) {
                    clearTimeout(killTimeout)
                }
                resolve()
            })
            serverProcess.kill(terminationDelay === 0 ? 'SIGTERM' : 'SIGINT')
        })

        return killPromise
    }

    // Ensure process is killed before exit
    process.on('exit', () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM')
        }
    })
    // catch ctrl-c
    process.on('SIGINT', () => {
        // Use same exit code as nodejs
        process.exit(128 + 2)
    })
    // catch kill
    process.on('SIGTERM', () => {
        // Use same exit code as nodejs
        process.exit(128 + 15)
    }) 
}

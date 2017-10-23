const webpack = require('webpack')
const childProcess = require('child_process')
const { supportsColor, yellow, red } = require('chalk')

const defaultConfig = {
    // Called whenever the process has been started
    onStart: () => {},
    // Delay calling `onStart` until output has been written to `stdout`
    waitForOutput: false,
    // Called whenever the node process closes
    onClose: () => {},
    // Called whenever input is written to the terminal with the trimmed input-string
    onInput: (input, startProcess) => {
        switch (input) {
            case 'rs':
            case 'restart':
                startProcess()
                break
            case 'debug':
                startProcess({ debug: true })
                break
            case 'normal':
                startProcess({ debug: false })
                break
        }
    },
    // Called whenever webpack compiles
    onCompile: (error, stats, startProcess) => {
        if (error) {
            console.log(red('Webpack compilation error'), error)
        } else if (stats.hasErrors()) {
            console.log(stats.toString({ chunks: false, colors: true }))
        } else {
            console.log(stats.toString({ chunks: false, colors: true }))

            startProcess()
        }
    },
    // Default options passed to process start
    defaultStartupOptions: { debug: false },
    // Enhance the environment variables of the node process
    getEnvironment: () => ({}),
    // Entrypoint, if null it will be webpackConfig.output.filename
    entrypoint: null,
    // Current working directory, if null it will be webpackConfig.output.path
    cwd: null,
    // Wait between SIGINT and SIGKILL
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

    let nodeProcess = null
    let killPromise = null
    let startupOptions = defaultStartupOptions

    webpack(webpackConfig)
        .watch({}, (error, stats) => {
            onCompile(error, stats, startProcess, startupOptions)
        })

    var stdin = process.openStdin()

    stdin.addListener('data', (chunk) => {
        const input = chunk.toString().trim()
        onInput(input, startProcess, startupOptions)
    })

    const initProcess = (options) => {
        startupOptions = Object.assign({}, startupOptions, options)
        nodeProcess = childProcess.spawn(
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
                // Do not inherit stdout, manually piped piped below
                stdio: [process.stdin, 'pipe', process.stderr],
            }
        )
        let hasOutput = false
        nodeProcess.stdout.addListener('data', (chunk) => {
            if (waitForOutput && !hasOutput) {
                onStart(startProcess, startupOptions)
                hasOutput = true
            }
            process.stdout.write(chunk)
        })
        if (!waitForOutput) {
            onStart(startProcess, startupOptions)
        }

        nodeProcess.on('close', (code) => {
            if (killPromise) {
                console.log(yellow('Process restarted..'))
                onClose('kill', startProcess, startupOptions)
            } else if (code === 0) {
                console.log(yellow('Process exited cleanly, restarts on new compilation'))
                onClose('clean', startProcess, startupOptions)
            } else {
                console.log(red('Process crashed, restarts on new compilation'))
                onClose('crash', startProcess, startupOptions)
            }

            nodeProcess = null
            killPromise = null
        })
    }

    const startProcess = (options) => {
        if (!nodeProcess && !killPromise) {
            process.nextTick(() => initProcess(options))
        } else if (!killPromise) {
            killProcess().then(() => initProcess(options))
        }
    }

    const killProcess = () => {
        if (!nodeProcess) {
            throw new Error('Node process not running, cannot kill')
        }
        if (killPromise) {
            return killPromise
        }
        killPromise = new Promise((resolve) => {
            let killTimeout = null
            if (terminationDelay) {
                // Send SIGKILL after timeout
                killTimeout = setTimeout(() => {
                    killTimeout = null
                    nodeProcess.kill('SIGKILL')
                }, 2000)
            }
            nodeProcess.on('close', () => {
                if (killTimeout) {
                    clearTimeout(killTimeout)
                }
                resolve()
            })
            nodeProcess.kill(terminationDelay === 0 ? 'SIGKILL' : 'SIGINT')
        })

        return killPromise
    }

    // Ensure process is killed before exit
    process.on('exit', () => {
        if (nodeProcess) {
            nodeProcess.kill('SIGKILL')
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

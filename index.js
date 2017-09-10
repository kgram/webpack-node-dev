const webpack = require('webpack')
const childProcess = require('child_process')
const { supportsColor, magenta, red } = require('chalk')

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
	onInput: (input, lastOptions, startServer) => {
		if (input === 'restart') {
			startServer(lastOptions)
		} else if (input === 'debug') {
			startServer(Object.assign({}, lastOptions, { debug: true }))
		} else if (input === 'normal') {
			startServer(Object.assign({}, lastOptions, { debug: false }))
		}
	},
	// Handle webpack compile
	// Receives error/stats from webpack, server-options from last start  and
	// the start/restart function
	onCompile: (error, stats, lastOptions, startServer) => {
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
			startServer(lastOptions)
		}
	},
	// Default options passed to server start. Useful if using additional flags
	// for env-variables
	defaultOptions: { debug: false },
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

module.exports = (webpackConfig, serverConfig) => {
	const {
		onStart,
		waitForOutput,
		onClose,
		onInput,
		onCompile,
		defaultOptions,
		getEnvironment,
		entrypoint,
		cwd,
		terminationDelay,
	} = Object.assign({}, defaultConfig, {
		entrypoint: webpackConfig.output.filename,
		cwd: webpackConfig.output.path,
	}, serverConfig)

	let serverProcess = null
	let killPromise = null
	let serverOptions = defaultOptions

	webpack(webpackConfig)
		.watch({

		}, (error, stats) => {
			onCompile(error, stats, serverOptions, startServer)
		})

	var stdin = process.openStdin()

	stdin.addListener('data', (chunk) => {
		const input = chunk.toString().trim()
		onInput(input, serverOptions, startServer)
	})

	const initServer = (options) => {
		serverOptions = options
		serverProcess = childProcess.spawn(
			'node',
			options.debug ? ['--inspect', entrypoint] : [entrypoint],
			{
				cwd,
				// Clone environment
				env: Object.assign({}, process.env, {
					// Force chalk to register the child process with the same color properties
					// Any value passed enables force-color
					FORCE_COLOR: supportsColor ? 'true' : undefined,
				}, getEnvironment(options)),
				// Do not inherit stdout, this is used to check when server is ready
				stdio: [process.stdin, 'pipe', process.stderr],
			}
		)
		let hasOutput = false
		serverProcess.stdout.addListener('data', (chunk) => {
			if (waitForOutput && !hasOutput) {
				onStart(options)
				hasOutput = true
			}
			process.stdout.write(chunk)
		})
		if (!waitForOutput) {
			onStart(options)
		}

		serverProcess.on('close', (code) => {
			// Parent have not requested exit
			if (killPromise) {
				console.log(magenta('Server restarted..'))
				onClose('kill')
			} else if (code === 0) {
				console.log(magenta('Server exited cleanly, restarts on new compilation'))
				onClose('clean')
			} else {
				console.log(red('Server crashed, restarts on new compilation'))
				onClose('crash')
			}

			serverProcess = null
			killPromise = null
		})
	}

	const startServer = (options) => {
		if (!serverProcess && !killPromise) {
			initServer(options)
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
}

// Ensure exit is called no matter the signal sent
process.on('SIGINT', () => process.exit()) // catch ctrl-c
process.on('SIGTERM', () => process.exit()) // catch kill

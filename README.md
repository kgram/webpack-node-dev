# webpack-node-dev

Monitor you webpack-built node process during development. Like nodemon, but built directly for webpack. Pass your webpack config to node-dev, it will start webpack in watch-mode and restart your process whenever it recompiles.

Somewhat like [nodemon](https://www.npmjs.com/package/nodemon), except hooked directly into webpack instead of watching for file-changes.

## Installation

```sh
npm i -D webpack-node-dev
```

## Running from commandline

`webpack-node-dev [-c/--config <webpack-config-path>]`.

The only flag possible is `-c`/`--config`. This is used to specify the webpack config file used. Default is `webpack.config.js`.

Configuration can be specified as `nodeDev` in the webpack config-file.

## Running programatically

The only export is a function for starting webpack in watch-mode and running/monitoring the node process. It takes the webpack config object as argument. Configuration can be specified as `nodeDev` in the webpack config-file or as a second argument to the function.

```typescript
const nodeDev = require('webpack-node-dev')

nodeDev(webpackConfig, {
    // Settings
})
```

## Configuration

### Common concepts

```typescript
StartupOptions: {
    debug: boolean,
    [key:string]: any,
}
```

Current settings for running the node process. The core script only recognizes the `debug` property, but other properties can be added freely and are passed to the `onStart`, `getEnvironment`, `onInput`, `onClose`, `onCompile`. 

`debug` toggles the node `--inspect` flag for the process.

---

```typescript
StartProcess: (options?: Partial<StartupOptions>) => void
```

Supplied as argument to relevant events. Terminates the running node instance if one exists, then starts the process again.

StartupOptions can be changed by passing an object as argument.

### Properties

```typescript
defaultStartupOptions: StartupOptions
```

The StartupOptions used to first start the node process.

Default value: 
```typescript
{ debug: false }
```

---

```typescript
onStart: (
    startProcess: StartProcess,
    options: StartupOptions,
) => void
```

Called whenever the process has been started. Useful for livereload-like scenarios. Can trigger a restart for API consistency, although it would probably be best not to, since it may cause a restart-loop.

Default value: 
```typescript
() => {}
```

---

```typescript
waitForOutput: boolean
```

Delay calling `onStart` until output has been written to `stdout`. Useful for servers that have to run setup before being available.

Default value: 
```typescript
false
```

---

```typescript
onClose: (
    reason: 'kill' | 'clean' | 'crash',
    startProcess: StartProcess,
    options: StartupOptions, 
) => void
```

Called whenever the node process closes. It takes an enum-string indicating what caused the process closure:

* `'kill'`: A call to `StartProcess`
* `'clean'`: Process exited with code 0
* `'crash'`: Process exited with non-zero code

Info about the closure is logged no matter what. It allows restarting the process, but this should generally be left to `onCompile` to avoid restart-loops.

Default value: 
```typescript
() => {}
```

---

```typescript
onInput: (
    input: string,
    startProcess: StartProcess,
    options: StartupOptions,
) => void
```

Called whenever input is written to the terminal with the trimmed input-string. The default implementation recognizes `rs` and `restart` for restarts with same options and `debug`/`normal` to toggle the `--inspect` flag. You can basically put any convinient code in here though, such as generating tokens for a given id.

Default value:
```typescript
(input, startProcess) => {
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
}
```

---

```typescript
onCompile: (
    error: WebpackWatchError,
    stats: WebpackStats, 
    startProcess: StartProcess,
    options: StartupOptions,
) => void
```

Called whenever webpack compiles. The default implementation logs the result of the compilation and restarts the node process if there were no errors.

Default value:
```typescript
(error, stats, startProcess) => {
    if (error) {
        console.log(red('Webpack compilation error'), error)
    } else if (stats.hasErrors()) {
        console.log(stats.toString({ chunks: false, colors: true }))
    } else {
        console.log(stats.toString({ chunks: false, colors: true }))
        
        startProcess()
    }
}
```

---

```typescript
getEnvironment: (
    options: StartupOptions
) => { [key: string]: string }
```

Enhance the environment variables of the node process. Besides anything returned here, `process.env` is included, as well as `FORCE_COLOR` for [chalk](https://www.npmjs.com/package/chalk) if color is supported. These can be overwritten by what is returned.

Default value: 
```typescript
() => ({})
```

---

```typescript
entrypoint: string | null
```

Scriptfile to run. If not set, `webpackConfig.output.filename` is used.

Default value: 
```typescript
null
```

---

```typescript
cwd: string | null
```

Current working directory for the node proess. If not set, `webpackConfig.output.path` is used.

Default value: 
```typescript
null
```

---

```typescript
terminationDelay: number | null
```

How long to wait (ms) after sending SIGINT until sending SIGTERM to the node process.

Set to 0 to send SIGTERM immediately instead of SIGINT.

Set to null to disable.

Default value: 
```typescript
2000
```


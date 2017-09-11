# webpack-node-dev

Monitor you webpack-built node process during development. Like nodemon, but built directly for webpack. Pass your webpack config to node-dev, it will start webpack in watch-mode and restart your server whenever it recompiles.

## Unpublished

This project is currently not published. While the script works, the surrounding package is not done.

<!-- ## Installation

```npm i -D webpack-node-dev``` -->

## Running from commandline

`webpack-node-dev [-c/--config <webpack-config-path>]`.

The only flag possible is `-c`/`--config`. This is used to specify the webpack config file used. Default is `webpack.config.js`.

## Running programatically

The only export is a function for starting webpack in watch-mode and running/monitoring the node process. It takes the webpack config object as argument. A second argument can be added with settings to avoid poluting the webpack config.

```javascript
const nodeDev = require('webpack-node-dev')

nodeDev(webpackConfig, {
    // Settings
})
```

## Configuration

Configuration is done by adding a `nodeDev` section to your webpack config file or as a second argument to the exported function.

The following properties can be used for configuration:

```typescript
defaultStartupOptions: {
    debug: boolean,
    [key:string]: any
}
```

The options for running the server initially. Adding custom properties can for instance be used to control environment variables. The only property recognized by the default settings is `debug`, toggling the `--inspect` flag for the node process.

The current `startupOptions` can be modified from `onInput`, `onCompile` or `onClose`.

Default value: `{ debug: false }`

---

```typescript
onStart: (
    startServer: (options: Partial<StartupOptions>) => void
    options: StartupOptions,
) => void
```

Called whenever the server has been started. Useful for livereload-like scenarios. Can trigger a restart for API consistency, although it would probably be best not to.

Default value: `() => {}`

---

```typescript
waitForOutput: boolean
```

Delay calling `onStart` until output has been written to `stdout`. Useful for servers that have to run setup before being available.

Default value: `false`

---

```typescript
onClose: (
    reason: 'kill' | 'clean' | 'crash',
    startServer: (options: Partial<StartupOptions>) => void
    options: StartupOptions, 
) => void
```

Called whenever the server-process closes. It takes an enum-string indicating what caused the process closure and the last startupOptions. It also allows you to start the server again, possibly with different settings. The server will also restart on a new webpack compile, so this is unlikely to be necessary.

Default value: `() => {}`

---

```typescript
onInput: (
    input: string,
    startServer: (options: Partial<StartupOptions>) => void
    options: StartupOptions,
) => void
```

Called whenever input is written to the terminal. Using the `startServer` function, the server can be started with modified `startupOptions` (with existing processes closed). The default implementation recognizes `rs` and `restart` for restarts with same options and `debug`/`normal` to switch the `--inspect` flag on/off. You can basically put any convinient code in here though, such as generating tokens for a given id.

Default value: Longer function

---

```typescript
onCompile: (
    error: WebpackWatchError,
    stats: WebpackStats, 
    startServer: (options: Partial<StartupOptions>) => void
    options: StartupOptions,
) => void
```

Called whenever webpack compiles. The default implementation logs the result of the compilation and restarts the server if there were no errors.

Default value: Longer function

---

```typescript
getEnvironment: (options: StartupOptions) => { [key: string]: string }
```

Enhance the environment variables of the node process. Besides anything returned here, `process.env` is included, as well as `FORCE_COLOR` for [chalk](https://www.npmjs.com/package/chalk) if color is supported. These can be overwritten.

Default value: `() => ({})`

---

```typescript
entrypoint: string | null
```

Scriptfile to run. If not set, `webpackConfig.output.filename` is used.

Default value: `null`

---

```typescript
cwd: string | null
```

Current working directory for the node proess. If not set, `webpackConfig.output.path` is used.

Default value: `null`

---

```typescript
terminationDelay: number | null
```

How long to wait (ms) after sending SIGINT until sending SIGTERM to the node process.

Set to 0 to send SIGTERM immediately instead of SIGINT.

Set to null to disable.

Default value: 2000


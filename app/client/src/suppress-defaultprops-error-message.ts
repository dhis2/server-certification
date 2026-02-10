// Without the following monkey-patch, we'll get A LOT of these error message on
// the console:
//
//   Support for defaultProps will be removed from function components in a
//   future major release. Use JavaScript default parameters instead.
//
// See: https://github.com/vitejs/vite/issues/7376
//
// @TODO: Change defaultProps into JS parameters in this codebase
// @TODO: Remove the following code once UI lib has moved to react@^18 and also
//        changed defaultProps to default parameters
const originalConsoleError = console.error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && /defaultProps/.test(args[0])) {
        return
    }

    originalConsoleError(...args)
}

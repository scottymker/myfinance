export function assertIsComponent(name: string, value: unknown) {
  const t = typeof value
  if (!(t === 'function' || (t === 'object' && value !== null))) {
    throw new Error(`Import problem: "${name}" is type ${t}, expected a React component (default export / correct casing?)`)
  }
}

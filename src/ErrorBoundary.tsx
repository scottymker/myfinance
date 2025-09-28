import { Component, ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message?: string; stack?: string; compStack?: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, message: (err as any)?.message ?? String(err), stack: (err as any)?.stack }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // keep both stacks so we can see source lines
    this.setState({ compStack: info.componentStack })
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{maxWidth:900, margin:'2rem auto', fontFamily:'system-ui, sans-serif'}}>
          <h1>Something went wrong.</h1>
          <p><strong>{this.state.message}</strong></p>
          <pre style={{whiteSpace:'pre-wrap', background:'#f6f6f6', padding:12, borderRadius:8}}>
{this.state.stack}
          </pre>
          <h4>Component stack</h4>
          <pre style={{whiteSpace:'pre-wrap', background:'#f6f6f6', padding:12, borderRadius:8}}>
{this.state.compStack}
          </pre>
          <p style={{fontSize:12, color:'#666'}}>Check DevTools → Console too.</p>
        </div>
      )
    }
    return this.props.children
  }
}

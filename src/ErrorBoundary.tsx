import { Component, ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = {
  hasError: boolean
  message?: string
  stack?: string
  compStack?: string
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(err: unknown) {
    const msg = (err as any)?.message ?? String(err)
    const st  = (err as any)?.stack ?? undefined
    return { hasError: true, message: msg, stack: st }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ compStack: info.componentStack })
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{maxWidth:900, margin:'2rem auto', fontFamily:'system-ui, sans-serif'}}>
          <h1>Something went wrong.</h1>
          {this.state.message && <p><strong>{this.state.message}</strong></p>}
          {this.state.stack && (
            <>
              <h4>Stack</h4>
              <pre style={{whiteSpace:'pre-wrap', background:'#f6f6f6', padding:12, borderRadius:8}}>{this.state.stack}</pre>
            </>
          )}
          {this.state.compStack && (
            <>
              <h4>Component stack</h4>
              <pre style={{whiteSpace:'pre-wrap', background:'#f6f6f6', padding:12, borderRadius:8}}>{this.state.compStack}</pre>
            </>
          )}
          <p style={{fontSize:12, color:'#666'}}>Check DevTools → Console too.</p>
        </div>
      )
    }
    return this.props.children
  }
}

import { Component, ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message?: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, message: (err as any)?.message ?? String(err) }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto p-6">
          <h1 className="text-xl font-semibold mb-2">Something went wrong.</h1>
          <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto">{this.state.message}</pre>
          <p className="text-xs text-gray-500 mt-2">Open DevTools → Console for details.</p>
        </div>
      )
    }
    return this.props.children
  }
}

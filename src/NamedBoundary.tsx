import { Component, ErrorInfo, ReactNode } from 'react'

type Props = { name: string; children: ReactNode }
type State = { hasError: boolean; message?: string }

export default class NamedBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: err?.message ?? String(err) }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Re-throw with a clearer message so the top ErrorBoundary shows the section
    throw new Error(`[Section: ${this.props.name}] ${error.message}`)
  }
  render() {
    return this.props.children
  }
}

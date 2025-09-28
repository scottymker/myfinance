import { Component, ErrorInfo, ReactNode } from 'react'
type Props = { name: string; children: ReactNode }
export default class NamedBoundary extends Component<Props> {
  componentDidCatch(e: Error, _info: ErrorInfo) {
    throw new Error(`[Section: ${this.props.name}] ${e.message}`)
  }
  render() { return this.props.children }
}

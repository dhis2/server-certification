import { Button, NoticeBox } from '@dhis2/ui'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './error-view.module.css'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    handleGoHome = () => {
        this.setState({ hasError: false, error: null })
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className={styles.container}>
                    <NoticeBox className={styles.noticebox} error title="Sorry, an unexpected error has occurred">
                        {this.state.error?.message || 'Something went wrong'}
                    </NoticeBox>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button onClick={this.handleReset}>Try again</Button>
                        <Button primary onClick={this.handleGoHome}>
                            Go home
                        </Button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#222', color: '#ff6b6b', margin: '20px', borderRadius: '8px', overflow: 'auto', textAlign: 'left' }}>
          <h2>React Runtime Crash!</h2>
          <p>Please copy this error and send it to the assistant:</p>
          <details style={{ whiteSpace: 'pre-wrap', background: '#111', padding: '10px', borderRadius: '4px' }} open>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Show Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;

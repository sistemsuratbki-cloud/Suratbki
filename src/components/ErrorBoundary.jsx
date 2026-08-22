import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main, #f8fafc)',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--bg-card, #ffffff)',
              border: '1.5px solid #fecaca',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              Terjadi Kendala Tampilan
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Aplikasi mendeteksi kendala pada pemuatan halaman. Silakan klik tombol di bawah untuk memuat ulang sistem.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.75rem',
                  color: '#475569',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '120px'
                }}
              >
                {this.state.error?.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleReset}
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                <span>Muat Ulang Aplikasi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

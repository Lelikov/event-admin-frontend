import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { ErrorBoundary } from 'events-design-system'
import 'events-design-system/styles.css'
import './app.css'
import App from './App.tsx'
import { AuthProvider } from './modules/auth/AuthContext.tsx'
import { TimeZoneProvider } from './modules/settings/TimeZoneContext.tsx'
import { initSentry } from './observability/sentry'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={(e, info) => Sentry.captureException(e, { extra: { componentStack: info.componentStack } })}
      homeHref="/dashboard"
    >
      <TimeZoneProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TimeZoneProvider>
    </ErrorBoundary>
  </StrictMode>,
)

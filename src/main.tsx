import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'events-design-system/styles.css'
import './app.css'
import App from './App.tsx'
import { AuthProvider } from './modules/auth/AuthContext.tsx'
import { TimeZoneProvider } from './modules/settings/TimeZoneContext.tsx'
import { ErrorBoundary } from './modules/shared/ErrorBoundary.tsx'
import { initSentry } from './observability/sentry'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <TimeZoneProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TimeZoneProvider>
    </ErrorBoundary>
  </StrictMode>,
)

import { Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'
import App from './App'
import {
  CalendarPage,
  CustomerDetailPage,
  CustomersPage,
  HomePage,
  IncomePage,
  PageLoader,
  ScheduleEditorPage,
  SettingsPage,
} from './lazyPages'

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
)

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'calendar', element: withSuspense(<CalendarPage />) },
      { path: 'customers', element: withSuspense(<CustomersPage />) },
      { path: 'income', element: withSuspense(<IncomePage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
      { path: 'schedule/new', element: withSuspense(<ScheduleEditorPage />) },
      { path: 'customer/:id', element: withSuspense(<CustomerDetailPage />) },
    ],
  },
])

import { lazy } from 'react'
import { AppLoading } from '../components/AppLoading/AppLoading'

export const CalendarPage = lazy(() => import('../pages/Calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })))
export const CustomersPage = lazy(() => import('../pages/Customers/CustomersPage').then((module) => ({ default: module.CustomersPage })))
export const IncomePage = lazy(() => import('../pages/Income/IncomePage').then((module) => ({ default: module.IncomePage })))
export const SettingsPage = lazy(() => import('../pages/Settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))
export const ScheduleEditorPage = lazy(() => import('../pages/ScheduleEditor/ScheduleEditorPage').then((module) => ({ default: module.ScheduleEditorPage })))
export const CustomerDetailPage = lazy(() => import('../pages/CustomerDetail/CustomerDetailPage').then((module) => ({ default: module.CustomerDetailPage })))

export const PageLoader = () => (
  <AppLoading tone="compact" title="正在打开页面" description="马上就好" />
)

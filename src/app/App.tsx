import { FloatingBubble, SafeArea, TabBar } from 'antd-mobile'
import { AddOutline, CalendarOutline, PayCircleOutline, SetOutline, TeamOutline } from 'antd-mobile-icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { StudioBrand } from '../components/StudioBrand/StudioBrand'
import { ScheduleProvider } from './ScheduleContext'

const navItems = [
  { key: '/calendar', title: '月度', icon: <CalendarOutline /> },
  { key: '/customers', title: '客户', icon: <TeamOutline /> },
  { key: '/income', title: '收入', icon: <PayCircleOutline /> },
  { key: '/settings', title: '设置', icon: <SetOutline /> },
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const isEditor = location.pathname.startsWith('/schedule')
  const isDetail = location.pathname.startsWith('/customer/')
  const hideChrome = isEditor || isDetail
  const activeKey = location.pathname.startsWith('/calendar')
    ? '/calendar'
    : location.pathname.startsWith('/customers') || location.pathname.startsWith('/customer')
      ? '/customers'
      : location.pathname.startsWith('/income')
        ? '/income'
        : location.pathname.startsWith('/settings')
          ? '/settings'
          : '/calendar'

  return (
    <ScheduleProvider>
      <div className="mx-auto min-h-dvh w-full max-w-107.5 bg-(--app-bg) text-(--app-text) shadow-[0_18px_55px_rgba(98,55,65,0.18)] sm:my-2 sm:overflow-hidden sm:rounded-7 sm:border sm:border-(--app-border)">
        <main className={hideChrome ? 'min-h-dvh bg-(--app-bg)' : 'min-h-dvh bg-(--app-bg) px-4 pb-26 pt-4'} id="main-content">
          {!hideChrome ? (
            <div className="studio-brand-bar">
              <StudioBrand variant="compact" />
            </div>
          ) : null}
          <Outlet />
        </main>

        {!hideChrome && (
          <FloatingBubble
            className="bridal-create-bubble"
            axis="lock"
            style={{
              '--initial-position-right': 'max(20px, calc((100vw - 430px) / 2 + 20px))',
              '--initial-position-bottom': '88px',
            }}
            onClick={() => navigate('/schedule/new')}
            aria-label="新建档期"
          >
            <AddOutline fontSize={28} />
          </FloatingBubble>
        )}

        {!hideChrome && (
          <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-107.5 border-t border-(--app-border) bg-white/95 shadow-[0_-14px_36px_rgba(79,44,52,0.06)] backdrop-blur">
            <TabBar activeKey={activeKey} onChange={(key) => navigate(key)} safeArea={false}>
              {navItems.map((item) => (
                <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
              ))}
            </TabBar>
            <SafeArea position="bottom" />
          </div>
        )}
      </div>
    </ScheduleProvider>
  )
}

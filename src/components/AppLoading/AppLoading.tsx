import './AppLoading.css'

type AppLoadingTone = 'full' | 'section' | 'compact' | 'overlay'

type AppLoadingProps = {
  title?: string
  description?: string
  tone?: AppLoadingTone
}

export const AppLoading = ({
  title = '正在准备工作台',
  description = '正在连接数据库并同步最新档期',
  tone = 'section',
}: AppLoadingProps) => (
  <div className={`app-loading app-loading--${tone}`} role="status" aria-live="polite">
    <div className="app-loading__card">
      <div className="app-loading__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="app-loading__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="app-loading__bar" aria-hidden="true">
        <span />
      </div>
    </div>
  </div>
)

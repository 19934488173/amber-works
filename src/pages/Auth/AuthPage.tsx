import { useState } from 'react'
import { Button, Form, Input, Toast } from 'antd-mobile'
import { StudioBrand } from '../../components/StudioBrand/StudioBrand'
import { useAuth } from '../../app/useAuth'

type AuthMode = 'sign-in' | 'sign-up'

type AuthFormValues = {
  email?: string
  password?: string
}

export const AuthPage = () => {
  const { signIn, signUp } = useAuth()
  const [form] = Form.useForm<AuthFormValues>()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (values: AuthFormValues) => {
    const email = values.email?.trim()
    const password = values.password ?? ''

    if (!email) {
      Toast.show('请输入邮箱')
      return
    }

    if (password.length < 6) {
      Toast.show('密码至少 6 位')
      return
    }

    try {
      setIsSubmitting(true)
      if (mode === 'sign-in') {
        await signIn(email, password)
        Toast.show('已登录')
      } else {
        await signUp(email, password)
        Toast.show('账号已创建，请按 Supabase 邮件设置完成确认')
      }
    } catch (error) {
      Toast.show(error instanceof Error ? error.message : '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page min-h-dvh bg-(--app-bg) px-4 py-6">
      <div className="auth-page__panel mx-auto w-full max-w-107.5">
        <header className="auth-page__brand">
          <StudioBrand variant="full" />
        </header>

        <section className="auth-page__card">
          <div className="auth-page__headline">
            <h1>{mode === 'sign-in' ? '登录账号' : '创建账号'}</h1>
            <p>{mode === 'sign-in' ? '登录后档期会保存到云端数据库' : '用邮箱和密码创建工作室账号'}</p>
          </div>

          <Form form={form} layout="vertical" footer={
            <Button block color="primary" loading={isSubmitting} onClick={() => form.submit()}>
              {mode === 'sign-in' ? '登录' : '注册'}
            </Button>
          } onFinish={(values) => { void submit(values) }}>
            <Form.Item name="email" label="邮箱">
              <Input clearable type="email" autoComplete="email" placeholder="name@example.com" />
            </Form.Item>
            <Form.Item name="password" label="密码">
              <Input clearable type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} placeholder="至少 6 位" />
            </Form.Item>
          </Form>

          <button
            type="button"
            className="auth-page__switch"
            onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          >
            {mode === 'sign-in' ? '还没有账号？创建一个' : '已有账号？去登录'}
          </button>
        </section>
      </div>
    </div>
  )
}

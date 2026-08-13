import type { Root } from 'react-dom/client'
import { createRoot } from 'react-dom/client'
import { unstableSetRender } from 'antd-mobile'

type React19Container = Element & {
  _reactRoot?: Root
}

unstableSetRender((node, container) => {
  const react19Container = container as React19Container
  react19Container._reactRoot ||= createRoot(react19Container)
  const root = react19Container._reactRoot

  root.render(node)

  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    root.unmount()
    react19Container._reactRoot = undefined
  }
})

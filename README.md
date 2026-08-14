# React + TypeScript + Vite

## Supabase 登录和云端数据库

这个项目支持两种模式：

- 不配置 Supabase：继续使用本机 IndexedDB，本地可用。
- 配置 Supabase：启用账号登录，登录后档期和设置保存到 Supabase Postgres。

### 配置步骤

1. 在 Supabase 新建一个免费项目。
2. 打开 Supabase SQL Editor，执行项目根目录的 `supabase-schema.sql`。
3. 复制 `.env.example` 为 `.env.local`，填入 Supabase 项目的 Project URL 和 anon public key。
4. 在 Supabase Authentication 里开启 Email 登录。开发阶段可以关闭 Confirm email，正式使用建议开启。
5. 启动项目后注册/登录账号，在设置页可以把当前设备的本地数据上传到云端。

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

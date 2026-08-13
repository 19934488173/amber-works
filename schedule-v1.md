# 个人工作档期台账 V1

一个仅供个人使用的手机端工作档期管理 PWA。

## 第一版范围

- React + TypeScript + Vite
- Ant Design Mobile 组件库
- IndexedDB 本地存储，Dexie 封装
- iPhone Safari 添加到主屏幕后作为 PWA 使用
- 不接服务器、账号、云数据库、多用户或 AI API

## 已搭建功能

- 首页：今日档期、本周概况、快速新建入口
- 档期页：周视图、月视图、当天档期列表、冲突数量提示
- 新增/编辑：标题、日期、时间、类型、状态、客户、地点、金额、备注
- 快速操作：档期卡片左滑完成、复制、删除
- 设置：JSON 导出、JSON 导入、清空数据
- 分享：生成适合微信发送的今日档期图片
- PWA：manifest、service worker、iPhone 主屏幕元信息

## 技术结构

```text
src/
├── app/
├── pages/
├── components/
├── db/
├── hooks/
├── utils/
└── types/
```

## 本地运行

```bash
npm install
npm run dev
```

当前开发服务器已启动在：`http://127.0.0.1:5174/`

## 验证命令

```bash
npm run lint
npm run build
```

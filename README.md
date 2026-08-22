# ModelBench Local

一个在本地运行、只允许调用 OpenRouter 免费模型的 AI Prompt 测试台。

![ModelBench Local 界面预览](public/modelbench-preview.png)

## 使用技术

| 技术 | 用途 |
| --- | --- |
| Next.js 16 + React 19 | Web 界面、组件状态和本地 API 路由 |
| TypeScript 5 | 前后端类型约束与接口数据建模 |
| Vinext + Vite 8 | 本地开发服务器与生产构建 |
| Tailwind CSS 4 + 自定义 CSS | 响应式界面、布局和视觉样式 |
| OpenRouter API | 获取在线免费模型并执行 Prompt 测试 |
| OpenAPI 3.1 | 描述 `/api/models` 和 `/api/chat` 接口 |
| Web Storage | 使用 `sessionStorage` 临时保存 API Key，使用 `localStorage` 保存最近运行记录 |
| pnpm | 依赖安装与项目脚本管理 |

项目不依赖云端数据库。页面、API 代理和免费模型费用保护均在本地应用中运行；只有模型请求会发送到 OpenRouter。

## 项目结构

```text
app/
├── app/page.tsx             # ModelBench 测试界面
├── app/api/models/route.ts  # 获取并过滤免费模型
├── app/api/chat/route.ts    # 免费模型验证与请求代理
├── public/                  # README 截图等静态资源
└── openapi.yaml             # OpenAPI 3.1 接口定义
```

## 本地启动

1. 安装 Node.js 22.13 或更高版本，以及 pnpm。
2. 在本目录执行 `pnpm install`。
3. 执行 `pnpm dev`。
4. 打开终端显示的 localhost 地址。
5. 在页面中临时填写 OpenRouter API Key。

API Key 只保存在浏览器 `sessionStorage`，不会写入项目文件或历史记录。服务端会在每次请求前验证模型当前仍为零价格；付费模型会被拒绝。

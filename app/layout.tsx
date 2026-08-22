import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ModelBench · 本地 AI 模型测试台',
  description: '一个在本地运行、只调用 OpenRouter 免费模型的 AI 测试工作台。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

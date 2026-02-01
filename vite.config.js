import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // 确保在 Electron 中资源路径正确
    server: {
        port: 5173,
        strictPort: true,
        // Electron 中禁用 webSecurity 后不需要代理
    }
})

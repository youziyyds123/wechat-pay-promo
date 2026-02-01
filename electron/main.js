import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // 禁用 webSecurity 以允许跨域请求 (绕过 CORS)
        },
        autoHideMenuBar: true
    });

    // 根据环境加载页面
    // 如果是开发环境 (通过 process.env.VITE_DEV_SERVER_URL 判断，或者简单地看是否在运行 vite)
    // 但既然我们已经在 package.json 定义了 electron:dev 是 vite build && electron . 
    // 这种方式其实运行的是 build 后的文件，除非我们也想支持 HMR。
    // 为了简单起见，我们先让它可以加载 dist/index.html
    // 如果想支持 HMR，需要检测 http://localhost:5173

    // 简单的判断逻辑：如果传递了参数或者环境变量指示开发模式
    // 这里我们假设 electron:dev 会先启动 vite server 然后 electron 连接它？
    // 不，目前的 script 是 "vite build && electron ."，这意味着它总是加载 build 后的文件。
    // 这样虽然没有 HMR，但能保证环境一致性。

    // 加载打包后的 index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'));

    // 打开开发者工具 (可选)
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

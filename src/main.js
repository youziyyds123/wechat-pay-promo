import './style.css';
import QRCode from 'qrcode';

// 应用状态
const state = {
  paymentMode: 'wechat',  // 'wechat' 或 'alipay'
  wxpCode: 'f2f0eQJ8Zei6-5sEA6Pqaeew8ztng5NI4x3bjilndvVSx9I',
  alipayCode: 'fkx164182dophtnqlcbut9e', // 支付宝默认 Code
  wechatName: '',      // 收款人名
  starCount: 2,        // 星号数量
  nameSuffix: '',      // 后缀字符
  topTitle: '推荐使用微信支付',
  qrImage: null,
  logoImage: null,
  logoSize: 120,
  errorLevel: 'H',
  wechatPayIcon: null,  // 微信支付图标
  alipayIcon: null      // 支付宝图标
};

// ...

// 初始化应用
function init() {
  document.querySelector('#app').innerHTML = `
        <div class="container" id="appContainer">
            <header>
                <div class="mode-switch">
                    <button class="mode-btn active" id="wechatModeBtn" data-mode="wechat">
                        <span>💚</span> 微信支付
                    </button>
                    <button class="mode-btn" id="alipayModeBtn" data-mode="alipay">
                        <span>💙</span> 支付宝
                    </button>
                </div>
                <h1 id="appTitle">微信支付推广图生成器 <span class="badge">Pro</span></h1>
                <p class="subtitle">内置二维码生成 · 一键生成精美推广图</p>
            </header>

            <div class="main-content">
                <!-- 左侧控制面板 -->
                <div class="control-panel">
                    <!-- 二维码生成区域 -->
                    <div class="qr-generator">
                        <h3 class="section-title">
                            <span class="icon">🔗</span>
                            微信支付链接
                        </h3>
                        <div class="wxp-input-group">
                            <span class="wxp-prefix">wxp://</span>
                            <input type="text" id="wxpCode" class="wxp-input" 
                                   value="${state.wxpCode}" 
                                   placeholder="输入或随机生成字符串">
                        </div>
                        <div class="qr-actions">
                            <button class="btn btn-random" id="randomBtn">
                                <span>🎲</span> 随机生成
                            </button>
                            <button class="btn btn-generate-qr" id="generateQrBtn">
                                <span>📱</span> 生成二维码
                            </button>
                        </div>
                        
                        <!-- Logo上传区域 -->
                        <div class="logo-upload-section">
                            <h4 class="sub-title">🖼️ Logo/头像（可选）</h4>
                            <div class="logo-row">
                                <div class="logo-upload-area" id="logoUploadArea">
                                    <div class="logo-placeholder" id="logoPlaceholder">
                                        <span>+</span>
                                        <p>点击上传</p>
                                    </div>
                                    <div class="logo-preview" id="logoPreview" style="display: none;">
                                        <img id="logoPreviewImg" alt="Logo预览">
                                        <button class="remove-logo-btn" id="removeLogoBtn">✕</button>
                                    </div>
                                </div>
                                <input type="file" id="logoInput" accept="image/*" hidden>
                                
                                <!-- 随机头像按钮 -->
                                <button class="btn btn-random-avatar" id="randomAvatarBtn">
                                    <span>🎲</span> 随机头像
                                </button>
                                
                                <!-- Logo尺寸滑块 -->
                                <div class="logo-size-control" id="logoSizeControl">
                                    <label>Logo尺寸: <span id="logoSizeValue">${state.logoSize}</span>px</label>
                                    <input type="range" id="logoSizeSlider" min="60" max="180" value="${state.logoSize}" class="slider">
                                    <div class="slider-labels">
                                        <span>小</span>
                                        <span>大</span>
                                    </div>
                                </div>
                            </div>
                            <span class="hint">建议使用正方形图片，将显示在二维码中心</span>
                        </div>
                        
                        <!-- 容错率选择 -->
                        <div class="error-level-section">
                            <h4 class="sub-title">🛡️ 容错率</h4>
                            <div class="error-level-options">
                                <label class="radio-option">
                                    <input type="radio" name="errorLevel" value="L">
                                    <span class="radio-label">L <small>(7%)</small></span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="errorLevel" value="M">
                                    <span class="radio-label">M <small>(15%)</small></span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="errorLevel" value="Q">
                                    <span class="radio-label">Q <small>(25%)</small></span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="errorLevel" value="H" checked>
                                    <span class="radio-label">H <small>(30%)</small></span>
                                </label>
                            </div>
                            <span class="hint">容错率越高，二维码越密集，但更容易识别。添加Logo时建议选择H</span>
                        </div>
                        
                        <!-- 隐藏的Canvas用于生成二维码 -->
                        <canvas id="qrCanvas" style="display: none;"></canvas>
                    </div>

                    <div class="divider"></div>

                    <!-- 文字设置 -->
                    <div class="text-section">
                        <h3 class="section-title">
                            <span class="icon">✏️</span>
                            自定义文字
                        </h3>
                        
                        <!-- 收款人名称组合 -->
                        <div class="name-builder">
                            <label class="name-builder-label">收款人名称</label>
                            <div class="name-builder-row">
                                <input type="text" id="wechatName" class="name-input" placeholder="微信名" maxlength="10">
                                <button type="button" class="btn-random-name" id="randomNameBtn" title="随机名称">🎲</button>
                                <span class="name-separator">（</span>
                                <select id="starCount" class="star-select">
                                    <option value="1">*</option>
                                    <option value="2" selected>**</option>
                                    <option value="3">***</option>
                                </select>
                                <input type="text" id="nameSuffix" class="suffix-input" placeholder="特" maxlength="2">
                                <span class="name-separator">）</span>
                            </div>
                            <div class="name-preview">
                                预览: <span id="namePreview">微信名（**特）</span>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label for="topTitle">顶部标题</label>
                            <input type="text" id="topTitle" value="${state.topTitle}" maxlength="20">
                        </div>
                    </div>

                    <div class="divider"></div>

                    <button class="btn btn-primary" id="generateBtn">
                        <span>🎨</span> 生成推广图
                    </button>

                    <button class="btn btn-download" id="downloadBtn" disabled>
                        <span>⬇️</span> 下载图片
                    </button>
                </div>

                <!-- 右侧预览区域 -->
                <div class="preview-panel">
                    <h3 class="section-title">
                        <span class="icon">📱</span>
                        效果预览
                    </h3>
                    <div class="canvas-wrapper">
                        <canvas id="resultCanvas" width="400" height="600"></canvas>
                    </div>
                </div>
            </div>

            <footer>
                <p>支持生成 600×600 高清二维码 · 自动合成推广图</p>
            </footer>
        </div>
    `;

  bindEvents();
  loadWechatPayIcon();  // 加载微信支付图标
  loadAlipayIcon();     // 加载支付宝图标
}

// 绑定事件
function bindEvents() {
  document.getElementById('randomBtn').addEventListener('click', randomizeCode);
  document.getElementById('generateQrBtn').addEventListener('click', generateQRCode);
  // 模式切换事件
  document.getElementById('wechatModeBtn').addEventListener('click', () => switchMode('wechat'));
  document.getElementById('alipayModeBtn').addEventListener('click', () => switchMode('alipay'));

  document.getElementById('generateBtn').addEventListener('click', generatePoster);
  document.getElementById('downloadBtn').addEventListener('click', downloadImage);

  // Logo上传事件
  document.getElementById('logoUploadArea').addEventListener('click', () => {
    document.getElementById('logoInput').click();
  });
  document.getElementById('logoInput').addEventListener('change', handleLogoUpload);
  document.getElementById('removeLogoBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    removeLogo();
  });

  // 输入框实时更新
  document.getElementById('wxpCode').addEventListener('input', (e) => {
    state.wxpCode = e.target.value;
  });

  // 名称构建器事件
  document.getElementById('wechatName').addEventListener('input', (e) => {
    state.wechatName = e.target.value;
    updateNamePreview();
    if (state.qrImage) generatePoster();
  });
  document.getElementById('starCount').addEventListener('change', (e) => {
    state.starCount = parseInt(e.target.value);
    updateNamePreview();
    if (state.qrImage) generatePoster();
  });
  document.getElementById('nameSuffix').addEventListener('input', (e) => {
    state.nameSuffix = e.target.value;
    updateNamePreview();
    if (state.qrImage) generatePoster();
  });

  document.getElementById('topTitle').addEventListener('input', (e) => {
    state.topTitle = e.target.value;
    if (state.qrImage) generatePoster();
  });

  // Logo尺寸滑块事件
  document.getElementById('logoSizeSlider').addEventListener('input', (e) => {
    state.logoSize = parseInt(e.target.value);
    document.getElementById('logoSizeValue').textContent = state.logoSize;
  });

  // 容错率选择事件
  document.querySelectorAll('input[name="errorLevel"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.errorLevel = e.target.value;
    });
  });

  // 随机头像按钮事件
  document.getElementById('randomAvatarBtn').addEventListener('click', fetchRandomAvatar);

  // 随机名称按钮事件
  document.getElementById('randomNameBtn').addEventListener('click', fetchRandomName);
}

/**
 * 获取随机名称
 */
async function fetchRandomName() {
  const btn = document.getElementById('randomNameBtn');
  const input = document.getElementById('wechatName');
  btn.disabled = true;
  btn.textContent = '⏳';

  try {
    const response = await fetch('https://cn.apihz.cn/api/zici/sjwm.php?id=10012741&key=66c078aae1ed4f6547af1019e657f12e');
    const data = await response.json();

    if (data.code === 200 && data.msg) {
      // 截取前10个字符
      const name = data.msg.substring(0, 10);
      input.value = name;
      state.wechatName = name;
      updateNamePreview();
      if (state.qrImage) generatePoster();
    } else {
      throw new Error('获取失败');
    }
  } catch (error) {
    console.error('获取随机名称失败:', error);
    alert('获取随机名称失败，请重试');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎲';
  }
}

/**
 * 获取随机头像
 */
async function fetchRandomAvatar() {
  const btn = document.getElementById('randomAvatarBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> 加载中...';

  try {
    const response = await fetch('https://cn.apihz.cn/api/img/qqtx.php?id=10012741&key=66c078aae1ed4f6547af1019e657f12e&num=1');
    const data = await response.json();

    if (data.code === 200 && data.data && data.data.length > 0) {
      const imageUrl = data.data[0];

      // 直接获取图片 (Electron 环境下已禁用 webSecurity，可直接跨域)
      const imgResponse = await fetch(imageUrl);
      const blob = await imgResponse.blob();
      const dataUrl = await blobToDataUrl(blob);

      const img = new Image();
      img.onload = () => {
        state.logoImage = img;

        // 显示预览
        document.getElementById('logoPlaceholder').style.display = 'none';
        document.getElementById('logoPreview').style.display = 'flex';
        document.getElementById('logoPreviewImg').src = dataUrl;

        btn.disabled = false;
        btn.innerHTML = '<span>🎲</span> 随机头像';
      };
      img.onerror = () => {
        alert('图片加载失败，请重试');
        btn.disabled = false;
        btn.innerHTML = '<span>🎲</span> 随机头像';
      };
      img.src = dataUrl;
    } else {
      throw new Error('获取失败');
    }
  } catch (error) {
    console.error('获取随机头像失败:', error);
    alert('获取随机头像失败，请重试');
    btn.disabled = false;
    btn.innerHTML = '<span>🎲</span> 随机头像';
  }
}

/**
 * Blob 转 DataURL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 加载微信支付图标
 */
function loadWechatPayIcon() {
  const img = new Image();
  img.onload = () => {
    state.wechatPayIcon = img;
    drawTemplate();
  };
  img.onerror = () => {
    console.warn('微信支付图标加载失败，使用默认样式');
    drawTemplate();
  };
  img.src = 'wxpayico.png'; // 移除开头的 /，使用相对路径
}

/**
 * 加载支付宝图标
 */
function loadAlipayIcon() {
  const img = new Image();
  img.onload = () => {
    state.alipayIcon = img;
  };
  img.src = 'alipay.png'; // 移除开头的 /，使用相对路径
}

/**
 * 切换支付模式
 */
function switchMode(mode) {
  if (state.paymentMode === mode) return;

  state.paymentMode = mode;

  // 更新按钮状态
  document.getElementById('wechatModeBtn').classList.toggle('active', mode === 'wechat');
  document.getElementById('alipayModeBtn').classList.toggle('active', mode === 'alipay');

  // 更新容器主题
  const container = document.getElementById('appContainer');
  container.classList.toggle('alipay-mode', mode === 'alipay');

  // 更新标题
  const title = document.getElementById('appTitle');
  if (mode === 'wechat') {
    title.innerHTML = '微信支付推广图生成器 <span class="badge">Pro</span>';
    state.topTitle = '推荐使用微信支付';
    document.getElementById('wxpCode').value = state.wxpCode;
  } else {
    title.innerHTML = '支付宝推广图生成器 <span class="badge alipay">Pro</span>';
    state.topTitle = '推荐使用支付宝';
    document.getElementById('wxpCode').value = 'https://qr.alipay.com/' + state.alipayCode; // 显示完整 URL
  }
  document.getElementById('topTitle').value = state.topTitle;

  // 重绘模板
  drawTemplate();
}

/**
 * 随机生成字符串
 */
function randomizeCode() {
  const isAlipay = state.paymentMode === 'alipay';

  if (isAlipay) {
    // 生成支付宝格式: fkx + 20位随机字符 (混合数字和小写字母)
    const prefix = 'fkx';
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let randomPart = '';
    for (let i = 0; i < 20; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    state.alipayCode = prefix + randomPart;
    document.getElementById('wxpCode').value = 'https://qr.alipay.com/' + state.alipayCode;
  } else {
    // 微信逻辑保持不变
    const original = 'f2f0eQJ8Zei6-5sEA6Pqaeew8ztng5NI4x3bjilndvVSx9I';
    let result = '';

    for (let i = 0; i < original.length; i++) {
      const char = original[i];
      if (/[a-z]/.test(char)) {
        result += String.fromCharCode(97 + Math.floor(Math.random() * 26));
      } else if (/[A-Z]/.test(char)) {
        result += String.fromCharCode(65 + Math.floor(Math.random() * 26));
      } else if (/[0-9]/.test(char)) {
        result += Math.floor(Math.random() * 10).toString();
      } else {
        result += char;
      }
    }
    state.wxpCode = result;
    document.getElementById('wxpCode').value = state.wxpCode;
  }

  // 生成新的二维码
  if (state.qrImage) {
    generateQRCode();
  }
}




/**
 * 获取完整的用户名称
 */
function getFullUserName() {
  const name = state.wechatName || '微信名';
  const stars = '*'.repeat(state.starCount);
  const suffix = state.nameSuffix || '特';
  return `${name}（${stars}${suffix}）`;
}

/**
 * 更新名称预览
 */
function updateNamePreview() {
  const preview = getFullUserName();
  document.getElementById('namePreview').textContent = preview;
}

/**
 * 处理Logo上传
 */
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.logoImage = img;

      // 显示预览
      document.getElementById('logoPlaceholder').style.display = 'none';
      document.getElementById('logoPreview').style.display = 'flex';
      document.getElementById('logoPreviewImg').src = event.target.result;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * 移除Logo
 */
function removeLogo() {
  state.logoImage = null;
  document.getElementById('logoInput').value = '';
  document.getElementById('logoPlaceholder').style.display = 'flex';
  document.getElementById('logoPreview').style.display = 'none';
}

/**
 * 处理微信支付图标上传
 */
function handleWechatIconUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.wechatPayIcon = img;

      // 显示预览
      document.getElementById('wechatIconPlaceholder').style.display = 'none';
      document.getElementById('wechatIconPreview').style.display = 'flex';
      document.getElementById('wechatIconPreviewImg').src = event.target.result;

      // 重新绘制
      drawTemplate();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * 移除微信支付图标
 */
function removeWechatIcon() {
  state.wechatPayIcon = null;
  document.getElementById('wechatIconInput').value = '';
  document.getElementById('wechatIconPlaceholder').style.display = 'flex';
  document.getElementById('wechatIconPreview').style.display = 'none';
  drawTemplate();
}

/**
 * 随机生成字符串，保持字符类型不变
 * 小写字母 -> 小写字母
 * 大写字母 -> 大写字母
 * 数字 -> 数字
 * 特殊字符保持不变
 */


/**
 * 生成 600x600 高清二维码
 */
async function generateQRCode() {
  const isAlipay = state.paymentMode === 'alipay';
  const qrUrl = isAlipay
    ? `https://qr.alipay.com/${state.alipayCode}`
    : `wxp://${state.wxpCode}`;

  const canvas = document.getElementById('qrCanvas');
  const ctx = canvas.getContext('2d');

  try {
    await QRCode.toCanvas(canvas, qrUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: state.errorLevel // 使用用户选择的容错级别
    });

    // 如果有Logo，在二维码中心绘制
    if (state.logoImage) {
      const logoSize = state.logoSize; // 使用用户选择的尺寸
      const logoX = (600 - logoSize) / 2;
      const logoY = (600 - logoSize) / 2;
      const borderRadius = Math.min(12, logoSize * 0.1);
      const padding = 8;

      // 绘制白色背景边框
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(logoX - padding, logoY - padding, logoSize + padding * 2, logoSize + padding * 2, borderRadius);
      ctx.fill();

      // 绘制Logo（圆角矩形）
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, borderRadius - 4);
      ctx.clip();
      ctx.drawImage(state.logoImage, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      // 绘制Logo边框
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, borderRadius - 4);
      ctx.stroke();
    }

    // 将二维码保存为图片
    const qrImage = new Image();
    qrImage.onload = () => {
      state.qrImage = qrImage;
      generatePoster();
    };
    qrImage.src = canvas.toDataURL('image/png');

  } catch (error) {
    console.error('生成二维码失败:', error);
    alert('生成二维码失败，请检查输入内容');
  }
}

/**
 * 绘制推广图模板
 */
function drawTemplate() {
  const canvas = document.getElementById('resultCanvas');
  const ctx = canvas.getContext('2d');

  // 统一分辨率
  const W = 1118;
  const H = 1524;
  canvas.width = W;
  canvas.height = H;
  // 公共参数
  const isAlipay = state.paymentMode === 'alipay';

  if (isAlipay) {
    // 支付宝分辨率 1080x1621
    canvas.width = 1080;
    canvas.height = 1621;
    drawAlipayTemplate(ctx, 1080, 1621);
  } else {
    // 微信分辨率 1118x1524
    canvas.width = 1118;
    canvas.height = 1524;
    drawWechatTemplate(ctx, 1118, 1524);
  }
}

/**
 * 绘制支付宝模板 (1080 x 1621)
 */
function drawAlipayTemplate(ctx, W, H) {
  const headerHeight = 260; // 顶部白色区域高度

  // 1. 绘制背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, headerHeight);
  ctx.fillStyle = '#1677FF';
  ctx.fillRect(0, headerHeight, W, H - headerHeight);

  // 2. 顶部 Logo + 文字 (图标在左，文字在右)
  if (state.alipayIcon) {
    // 图标绘制参数
    const iconSize = 110; // 图标正方形大小
    const text = '支付宝';
    const textColor = '#3d3a35';
    const font = 'bold 84px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';

    ctx.font = font;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const gap = 30; // 图标和文字的间距

    // 计算总宽度以居中
    const totalWidth = iconSize + gap + textWidth;
    const startX = (W - totalWidth) / 2;

    // 垂直居中于 headerHeight
    const centerY = headerHeight / 2;

    // 绘制图标
    // 假设 alipayIcon 是正方形图标，如果不是，需要调整
    // 为了美观，我们强制限制在 iconSize x iconSize
    ctx.drawImage(state.alipayIcon, startX, centerY - iconSize / 2, iconSize, iconSize);

    // 绘制文字
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, startX + iconSize + gap, centerY + 8); // +8 微调垂直对齐

    // 恢复基线
    ctx.textBaseline = 'alphabetic';
  }

  // 3. 标题 "推荐使用支付宝"
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 96px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.topTitle || '推荐使用支付宝', W / 2, headerHeight + 140);

  // 4. 白色卡片
  const qrSize = 680; // 稍微调小一点适配宽度
  const cardPadding = 50;
  const nameHeight = 130;
  const cardWidth = qrSize + cardPadding * 2;
  const cardHeight = qrSize + nameHeight + cardPadding * 2;
  const cardX = (W - cardWidth) / 2;
  const cardY = headerHeight + 240; // 卡片起始Y
  const cardRadius = 30;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 5. 二维码
  const qrX = cardX + cardPadding;
  const qrY = cardY + cardPadding;
  drawQRCode(ctx, qrX, qrY, qrSize);

  // 6. 收款人名称
  const nameY = qrY + qrSize + cardPadding + 40;
  ctx.fillStyle = '#333333';
  ctx.font = '52px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getFullUserName(), W / 2, nameY);

  // 7. 底部文字
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '56px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  // 底部留白调整
  const bottomTextY = H - 120;
  ctx.fillText('打开支付宝[扫一扫]', W / 2, bottomTextY);
}

/**
 * 绘制微信模板
 */
function drawWechatTemplate(ctx, W, H) {
  // 1. 绿色背景
  ctx.fillStyle = '#05c160';
  ctx.fillRect(0, 0, W, H);

  // 2. 白色弧形背景
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, 1200);
  ctx.quadraticCurveTo(W / 2, 1300, W, 1200);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // 3. 顶部标题
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 72px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.topTitle || '推荐使用微信支付', W / 2, 130);

  // 4. 白色卡片
  const qrSize = 700;
  const cardPadding = 50;
  const nameHeight = 100;
  const cardWidth = qrSize + cardPadding * 2;
  const cardHeight = qrSize + nameHeight + cardPadding * 2;
  const cardX = (W - cardWidth) / 2;
  const cardY = 200;
  const cardRadius = 40;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 5. 二维码
  const qrX = cardX + cardPadding;
  const qrY = cardY + cardPadding;
  drawQRCode(ctx, qrX, qrY, qrSize);

  // 6. 收款人名称
  const nameY = qrY + qrSize + cardPadding + 30;
  ctx.fillStyle = '#333333';
  ctx.font = '48px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getFullUserName(), W / 2, nameY);

  // 7. 底部 Logo 和文字
  const bottomY = 1350;
  const iconSize = 110;
  const logoX = W / 2 - 150;

  if (state.wechatPayIcon) {
    ctx.drawImage(state.wechatPayIcon, logoX - iconSize / 2, bottomY - iconSize / 2, iconSize, iconSize);
  } else {
    const logoRadius = 55;
    ctx.fillStyle = '#05c160';
    ctx.beginPath();
    ctx.arc(logoX, bottomY, logoRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(logoX - 25, bottomY);
    ctx.lineTo(logoX - 5, bottomY + 22);
    ctx.lineTo(logoX + 30, bottomY - 20);
    ctx.stroke();
  }

  ctx.fillStyle = '#4d4d4d';
  ctx.font = 'bold 80px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('微信支付', logoX + iconSize / 2 + 20, bottomY + 28);
}

/**
 * 绘制二维码通用函数
 */
function drawQRCode(ctx, x, y, size) {
  if (state.qrImage) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 16);
    ctx.clip();
    ctx.drawImage(state.qrImage, x, y, size, size);
    ctx.restore();
  } else {
    // 绘制占位符
    const squareSize = 50;
    for (let i = 0; i < size / squareSize; i++) {
      for (let j = 0; j < size / squareSize; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#E8E8E8' : '#FFFFFF';
        ctx.fillRect(x + i * squareSize, y + j * squareSize, squareSize, squareSize);
      }
    }
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '36px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击「生成二维码」', x + size / 2, y + size / 2 - 20);
    ctx.fillText('生成您的专属收款码', x + size / 2, y + size / 2 + 30);
  }
}

/**
 * 生成推广海报
 */
function generatePoster() {
  drawTemplate();

  if (state.qrImage) {
    document.getElementById('downloadBtn').disabled = false;
  }
}

/**
 * 下载图片
 */
function downloadImage() {
  if (!state.qrImage) {
    alert('请先生成二维码！');
    return;
  }

  const canvas = document.getElementById('resultCanvas');

  let filename;

  if (state.paymentMode === 'alipay') {
    // 支付宝格式：时间戳.jpg
    filename = `${Date.now()}.jpg`;
  } else {
    // 微信格式：微信图片_YYYYMMDDHHmmss_XX_XX.jpg
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const rand1 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const rand2 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    filename = `微信图片_${dateStr}_${rand1}_${rand2}.jpg`;
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/jpeg', 0.95);  // 使用 JPG 格式，质量 95%
  link.click();
}

// 启动应用
init();

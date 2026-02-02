// ⚠️ 确保 src 目录下有 msyh.ttc 字体文件
use eframe::egui;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread;
use std::time::Duration;

// ════════════════════════════════════════════
// 1. 数据结构定义
// ════════════════════════════════════════════

#[derive(Clone, PartialEq)]
enum Status {
    Idle,       // 等待中
    Scanning,   // 🔍 正在扫描资产
    Mining,     // ⛏️ 正在收矿
    Signing,    // 📝 正在签到
    Success,    // ✅ 全部完成
    Failed,     // ❌ 失败
}

// 账号数据模型
struct Account {
    id: usize,
    token: String,
    status: Status,

    // 核心资产数据
    balance: String,  // AVS 余额 (对应 json: coin)
    hashrate: String, // 算力 (对应 json: hashRate)
    level: String,    // 等级 (对应 json: teamLevel.desc)

    log: String,      // 实时日志
}

// 线程通信事件
enum AppEvent {
    // id, status, balance, hashrate, level, log
    Update(usize, Status, Option<String>, Option<String>, Option<String>, String),
    AllDone,
}

struct AvalonApp {
    accounts: Vec<Account>,
    event_rx: Receiver<AppEvent>,
    event_tx: Sender<AppEvent>,
    is_running: bool,
    progress: f32,

    // 统计面板
    success_count: usize,
    fail_count: usize,
    total_avs: f64, // 累计监控到的 AVS 总量

    // 动画状态
    time: f64,
}

impl AvalonApp {
    fn new(cc: &eframe::CreationContext) -> Self {
        setup_fonts(&cc.egui_ctx);
        setup_custom_style(&cc.egui_ctx);

        let (tx, rx) = channel();

        // ════════════════════════════════════════════
        // 🛠️ 在这里填入你的 Token 列表
        // ════════════════════════════════════════════
        let raw_tokens = vec![
            "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJxd2V3cWVxOTQ3OTRAcXEuY29tIiwiaWF0IjoxNzY5OTkyNzIxLCJleHAiOjE4MzA0NzI3MjF9.CMyG-8h4QFVenAN7Dhvx4oXvytK338uIGu8icwff_K7A66liYc-RA1IOWBvz48N6VGKzEXyjVM5dmRkd_vHC3Q",
            // 复制更多行添加小号...
        ];

        let accounts = raw_tokens
            .into_iter()
            .enumerate()
            .map(|(i, t)| Account {
                id: i,
                token: t.to_string(),
                status: Status::Idle,
                balance: "--".to_string(),
                hashrate: "--".to_string(),
                level: "--".to_string(),
                log: "等待指令...".to_string(),
            })
            .collect();

        Self {
            accounts,
            event_rx: rx,
            event_tx: tx,
            is_running: false,
            progress: 0.0,
            success_count: 0,
            fail_count: 0,
            total_avs: 0.0,
            time: 0.0,
        }
    }

    fn start_matrix(&mut self) {
        self.is_running = true;
        self.progress = 0.0;
        self.success_count = 0;
        self.fail_count = 0;
        self.total_avs = 0.0;

        for acc in &mut self.accounts {
            acc.status = Status::Idle;
            acc.log = "初始化连接...".to_string();
        }

        let accounts_copy: Vec<(usize, String)> = self.accounts.iter()
            .map(|a| (a.id, a.token.clone()))
            .collect();
        let tx = self.event_tx.clone();

        thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let client = reqwest::Client::builder()
                    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .build()
                    .unwrap();

                for (idx, token) in accounts_copy {
                    // ─── 1. 资产扫描 (获取 coin 和 hashRate) ───
                    let _ = tx.send(AppEvent::Update(idx, Status::Scanning, None, None, None, "🔍 正在扫描资产数据...".to_string()));

                    let info_url = "https://app.avalonavs.com/api/app/api/personalDetails";
                    let mut current_balance = "0.00".to_string();
                    let mut current_hash = "0".to_string();
                    let mut current_level = "未知".to_string();

                    if let Ok(resp) = client.get(info_url).header("Authorization", &token).send().await {
                        if let Ok(json) = resp.json::<serde_json::Value>().await {
                            if let Some(data) = json.get("data") {
                                // 解析 Coin (余额)
                                if let Some(c) = data.get("coin") {
                                    current_balance = format!("{:.4}", c.as_f64().unwrap_or(0.0));
                                }
                                // 解析 HashRate (算力) - 注意 JSON 里是 hashRate
                                if let Some(h) = data.get("hashRate") {
                                    current_hash = format!("{:.1}", h.as_f64().unwrap_or(0.0));
                                }
                                // 解析 等级
                                if let Some(lvl) = data.pointer("/teamLevel/desc") {
                                    current_level = lvl.as_str().unwrap_or("见习生").to_string();
                                }
                            }
                        }
                    }

                    // 更新UI显示资产
                    let _ = tx.send(AppEvent::Update(idx, Status::Scanning,
                                                     Some(current_balance.clone()),
                                                     Some(current_hash.clone()),
                                                     Some(current_level.clone()),
                                                     format!("资产快照: {} AVS | 算力: {}", current_balance, current_hash)
                    ));

                    // ─── 2. 每日签到 ───
                    tokio::time::sleep(Duration::from_millis(300)).await;
                    let _ = tx.send(AppEvent::Update(idx, Status::Signing, None, None, None, "📝 正在签到...".to_string()));

                    let sign_res = client.post("https://app.avalonavs.com/api/app/api/signIn/keepSignIn")
                        .header("Authorization", &token)
                        .header("Content-Type", "application/json")
                        .body("{}")
                        .send()
                        .await;

                    // 这里的状态不需要太关注，主要是为了拿奖励
                    if let Ok(r) = sign_res {
                        if !r.status().is_success() {
                            // 即使签到失败(比如重复签到)也不影响后续收矿
                        }
                    }

                    // ─── 3. 自动收矿 (遍历 incomeList) ───
                    tokio::time::sleep(Duration::from_millis(500)).await;
                    let _ = tx.send(AppEvent::Update(idx, Status::Mining, None, None, None, "⛏️ 正在扫描矿机收益...".to_string()));

                    let list_url = "https://app.avalonavs.com/api/app/api/income/incomeList?balanceCapitalTyp=coin";
                    let mut harvest_msg = "✅ 暂无待收收益".to_string();
                    let mut harvest_amount = 0.0;

                    if let Ok(list_resp) = client.get(list_url).header("Authorization", &token).send().await {
                        if let Ok(json) = list_resp.json::<serde_json::Value>().await {
                            if let Some(list) = json["data"].as_array() {
                                if !list.is_empty() {
                                    harvest_msg = format!("检测到 {} 笔收益，开始收割...", list.len());
                                    let _ = tx.send(AppEvent::Update(idx, Status::Mining, None, None, None, harvest_msg.clone()));

                                    for item in list {
                                        if let Some(income_id) = item["id"].as_i64() {
                                            let amt = item["amount"].as_f64().unwrap_or(0.0);

                                            // 发送领取请求
                                            let recv_url = format!("https://app.avalonavs.com/api/app/api/income/receiveIncome/{}", income_id);
                                            let _ = client.post(&recv_url)
                                                .header("Authorization", &token)
                                                .header("Content-Type", "application/json")
                                                .body("{}")
                                                .send()
                                                .await;

                                            harvest_amount += amt;
                                            tokio::time::sleep(Duration::from_millis(200)).await;
                                        }
                                    }
                                    harvest_msg = format!("💰 收割成功! 获得 {:.4} AVS", harvest_amount);
                                }
                            }
                        }
                    }

                    // ─── 任务完成 ───
                    let _ = tx.send(AppEvent::Update(idx, Status::Success, None, None, None, harvest_msg));

                    // 模拟随机延迟，防止并发过高被封 IP
                    let delay = rand::random::<u64>() % 1000 + 500;
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                }

                let _ = tx.send(AppEvent::AllDone);
            });
        });
    }
}

// ════════════════════════════════════════════
// 2. UI 渲染 (赛博朋克风格)
// ════════════════════════════════════════════

impl eframe::App for AvalonApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.time += ctx.input(|i| i.stable_dt) as f64;

        while let Ok(event) = self.event_rx.try_recv() {
            match event {
                AppEvent::Update(id, status, bal, hash, lvl, log) => {
                    if let Some(acc) = self.accounts.get_mut(id) {
                        if (status == Status::Success) && acc.status != Status::Success {
                            self.success_count += 1;
                        }
                        if (status == Status::Failed) && acc.status != Status::Failed {
                            self.fail_count += 1;
                        }
                        acc.status = status;
                        acc.log = log;

                        if let Some(b) = bal {
                            // 更新总资产统计
                            let old_val = acc.balance.parse::<f64>().unwrap_or(0.0);
                            let new_val = b.parse::<f64>().unwrap_or(0.0);
                            if new_val > 0.0 && old_val == 0.0 { // 简单累加逻辑，避免重复
                                self.total_avs += new_val;
                            }
                            acc.balance = b;
                        }
                        if let Some(h) = hash { acc.hashrate = h; }
                        if let Some(l) = lvl { acc.level = l; }
                    }

                    // 计算总进度
                    let done_cnt = self.accounts.iter().filter(|a| a.status == Status::Success || a.status == Status::Failed).count();
                    self.progress = done_cnt as f32 / self.accounts.len() as f32;
                }
                AppEvent::AllDone => {
                    self.is_running = false;
                }
            }
        }

        // ─── 左侧控制面板 ───
        egui::SidePanel::left("sidebar").resizable(false).default_width(240.0).show(ctx, |ui| {
            ui.add_space(20.0);

            // 动态 Logo
            ui.vertical_centered(|ui| {
                let (response, painter) = ui.allocate_painter(egui::vec2(80.0, 80.0), egui::Sense::hover());
                let rect = response.rect;
                let center = rect.center();
                let radius = rect.width() / 2.0;
                let pulse = (self.time * 3.0).sin() * 2.0;

                // 外圈呼吸光环
                painter.circle_stroke(center, radius - 4.0 + pulse as f32, egui::Stroke::new(2.0, egui::Color32::from_rgb(0, 255, 200)));
                // 内部实心核心
                painter.circle_filled(center, radius * 0.5, egui::Color32::from_rgb(0, 100, 80));

                ui.add_space(15.0);
                ui.heading(egui::RichText::new("AVALON TERMINAL").color(egui::Color32::from_rgb(0, 255, 200)).strong());
                ui.label(egui::RichText::new("v5.0 Matrix Edition").size(10.0).weak().extra_letter_spacing(1.0));
            });

            ui.add_space(30.0);
            ui.separator();
            ui.add_space(20.0);

            // 控制区
            ui.vertical_centered(|ui| {
                if self.is_running {
                    ui.add(egui::Spinner::new().size(28.0));
                    ui.add_space(10.0);
                    ui.label(egui::RichText::new(format!("SYSTEM BUSY {:.0}%", self.progress * 100.0)).color(egui::Color32::YELLOW));
                } else {
                    let btn = egui::Button::new(egui::RichText::new("🚀 启动全自动收割").size(16.0).strong())
                        .min_size(egui::vec2(200.0, 50.0)).rounding(6.0);
                    if ui.add(btn).clicked() { self.start_matrix(); }
                }
            });

            ui.add_space(40.0);

            // 统计仪表盘
            ui.label(egui::RichText::new("NETWORK MONITOR").size(10.0).weak());
            egui::Grid::new("stats").spacing([10.0, 15.0]).show(ui, |ui| {
                stat_card(ui, "TOTAL BOTS", &format!("{}", self.accounts.len()), egui::Color32::WHITE);
                stat_card(ui, "ONLINE", &format!("{}", self.success_count), egui::Color32::GREEN);
                ui.end_row();
                stat_card(ui, "TOTAL AVS", &format!("{:.2}", self.total_avs), egui::Color32::GOLD);
                stat_card(ui, "ERRORS", &format!("{}", self.fail_count), egui::Color32::RED);
                ui.end_row();
            });
        });

        // ─── 右侧主终端 ───
        egui::CentralPanel::default().show(ctx, |ui| {
            // 顶部进度条
            ui.add(egui::ProgressBar::new(self.progress).animate(self.is_running).fill(egui::Color32::from_rgb(0, 200, 150)).rounding(2.0));
            ui.add_space(10.0);

            // 终端窗口
            egui::Frame::none()
                .fill(egui::Color32::from_rgb(10, 12, 16)) // 深黑背景
                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(40, 40, 50)))
                .rounding(8.0)
                .inner_margin(15.0)
                .show(ui, |ui| {

                    // 终端标题栏
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new(" >_ ROOT@MATRIX:~/HARVESTER").monospace().color(egui::Color32::from_rgb(0, 255, 200)));
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            ui.label(egui::RichText::new("ENCRYPTED").size(10.0).color(egui::Color32::GREEN));
                        });
                    });
                    ui.separator();
                    ui.add_space(5.0);

                    // 滚动列表
                    egui::ScrollArea::vertical().auto_shrink([false; 2]).stick_to_bottom(true).show(ui, |ui| {
                        egui::Grid::new("log_grid")
                            .spacing([20.0, 12.0])
                            .striped(true)
                            .show(ui, |ui| {
                                // 表头
                                ui.label(egui::RichText::new("ID").strong().color(egui::Color32::GRAY));
                                ui.label(egui::RichText::new("TOKEN").strong().color(egui::Color32::GRAY));
                                ui.label(egui::RichText::new("等级").strong().color(egui::Color32::GRAY));
                                ui.label(egui::RichText::new("⚡ 算力").strong().color(egui::Color32::from_rgb(0, 255, 255)));
                                ui.label(egui::RichText::new("💰 余额(AVS)").strong().color(egui::Color32::GOLD));
                                ui.label(egui::RichText::new("执行状态").strong().color(egui::Color32::GRAY));
                                ui.end_row();

                                for acc in &self.accounts {
                                    // ID
                                    ui.label(egui::RichText::new(format!("#{:02}", acc.id + 1)).monospace().color(egui::Color32::from_rgb(80, 80, 80)));

                                    // Token Mask
                                    let mask = if acc.token.len() > 8 { format!("{}..{}", &acc.token[..4], &acc.token[acc.token.len()-4..]) } else { "ERR".into() };
                                    ui.label(egui::RichText::new(mask).monospace().color(egui::Color32::from_rgb(60, 60, 70)));

                                    // 等级
                                    ui.label(egui::RichText::new(&acc.level).size(12.0).color(egui::Color32::LIGHT_GRAY));

                                    // 算力
                                    ui.label(egui::RichText::new(&acc.hashrate).monospace().strong().color(egui::Color32::from_rgb(0, 255, 255)));

                                    // 余额 (高亮)
                                    ui.label(egui::RichText::new(&acc.balance).monospace().strong().color(egui::Color32::GOLD));

                                    // 状态日志
                                    let (status_text, color) = match acc.status {
                                        Status::Idle => ("WAITING", egui::Color32::GRAY),
                                        Status::Scanning => ("SCANNING...", egui::Color32::LIGHT_BLUE),
                                        Status::Mining => ("HARVESTING...", egui::Color32::from_rgb(255, 140, 0)),
                                        Status::Signing => ("SIGNING...", egui::Color32::YELLOW),
                                        Status::Success => ("DONE", egui::Color32::GREEN),
                                        Status::Failed => ("ERROR", egui::Color32::RED),
                                    };

                                    ui.horizontal(|ui| {
                                        ui.colored_label(color, status_text);
                                        ui.label(egui::RichText::new(&acc.log).weak().size(11.0));
                                    });
                                    ui.end_row();
                                }
                            });
                    });
                });
        });

        ctx.request_repaint();
    }
}

// 辅助组件：统计卡片
fn stat_card(ui: &mut egui::Ui, title: &str, value: &str, color: egui::Color32) {
    egui::Frame::none()
        .fill(egui::Color32::from_rgb(30, 32, 40))
        .rounding(5.0)
        .inner_margin(8.0)
        .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(50, 50, 60)))
        .show(ui, |ui| {
            ui.set_min_width(70.0);
            ui.vertical_centered(|ui| {
                ui.label(egui::RichText::new(value).size(18.0).strong().color(color));
                ui.label(egui::RichText::new(title).size(9.0).weak());
            });
        });
}

fn setup_custom_style(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.panel_fill = egui::Color32::from_rgb(15, 17, 21); // 背景更深
    visuals.window_fill = egui::Color32::from_rgb(15, 17, 21);
    visuals.selection.bg_fill = egui::Color32::from_rgb(0, 200, 150);
    ctx.set_visuals(visuals);
}

fn setup_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();
    fonts.font_data.insert("my_font".to_owned(), egui::FontData::from_static(include_bytes!("msyh.ttc")));
    fonts.families.entry(egui::FontFamily::Proportional).or_default().insert(0, "my_font".to_owned());
    fonts.families.entry(egui::FontFamily::Monospace).or_default().insert(0, "my_font".to_owned());
    ctx.set_fonts(fonts);
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([1100.0, 700.0]),
        ..Default::default()
    };
    eframe::run_native("Avalon Matrix Terminal", options, Box::new(|cc| Ok(Box::new(AvalonApp::new(cc)))))
}
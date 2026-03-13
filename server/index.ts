<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>NEXA OS</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
:root {
  --bg:#0a0a0a;--surface:#111111;--surface2:#161616;--border:#2a2a2a;--border-gold:rgba(212,165,62,0.25);
  --gold:#D4A53E;--gold-light:#F0C060;--gold-dim:rgba(212,165,62,0.5);--gold-glow:0 0 20px rgba(212,165,62,0.25);
  --text:#c8c8c8;--text-dim:#555;--text-bright:#ffffff;--warn:#e05555;--success:#5cb85c;--info:#5b9bd5;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
body{background:var(--bg);color:var(--text);font-family:'Rajdhani',sans-serif;min-height:100vh;overflow-x:hidden;}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(212,165,62,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(212,165,62,0.015) 1px,transparent 1px);background-size:48px 48px;pointer-events:none;z-index:0;}
body::after{content:'';position:fixed;top:0;left:0;right:0;height:300px;background:radial-gradient(ellipse at 50% 0%,rgba(212,165,62,0.06) 0%,transparent 70%);pointer-events:none;z-index:0;}
.app{position:relative;z-index:1;max-width:480px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;}

/* HEADER */
.header{padding:14px 18px 12px;border-bottom:1px solid var(--border);background:rgba(10,10,10,0.97);backdrop-filter:blur(20px);position:sticky;top:0;z-index:100;}
.header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.logo{display:flex;align-items:center;gap:11px;}
.logo-mark{width:38px;height:38px;background:linear-gradient(135deg,#1a1500,#2a2000);border:1.5px solid var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:var(--gold-glow),inset 0 0 12px rgba(212,165,62,0.08);animation:goldPulse 4s ease-in-out infinite;flex-shrink:0;}
@keyframes goldPulse{0%,100%{box-shadow:var(--gold-glow),inset 0 0 12px rgba(212,165,62,0.08)}50%{box-shadow:0 0 30px rgba(212,165,62,0.4),inset 0 0 18px rgba(212,165,62,0.15)}}
.logo-mark svg{width:20px;height:20px;}
.logo-name{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:var(--text-bright);letter-spacing:4px;line-height:1;}
.logo-name span{color:var(--gold);}
.logo-sub{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--gold-dim);letter-spacing:3px;margin-top:3px;text-transform:uppercase;}
.header-right{display:flex;align-items:center;gap:5px;}
.hdr-btn{display:flex;align-items:center;gap:3px;background:rgba(212,165,62,0.07);border:1px solid var(--border-gold);border-radius:6px;padding:4px 7px;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--gold-dim);cursor:pointer;letter-spacing:1px;transition:all 0.2s;white-space:nowrap;}
.hdr-btn:hover{background:rgba(212,165,62,0.14);color:var(--gold);}
.hdr-btn.active{background:rgba(212,165,62,0.15);color:var(--gold);border-color:var(--gold);}
.hdr-btn.syncing{animation:syncPulse 0.9s ease-in-out infinite;pointer-events:none;}
.hdr-btn svg{width:10px;height:10px;flex-shrink:0;}
@keyframes syncPulse{0%,100%{opacity:1}50%{opacity:0.35}}
.status-indicator{display:flex;align-items:center;gap:5px;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--success);letter-spacing:1.5px;text-transform:uppercase;}
.status-dot{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 8px var(--success);animation:blink 2.5s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}

/* NAV */
.nav{display:flex;background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:8px;padding:3px;}
.nav-btn{flex:1;padding:7px 4px;background:none;border:none;border-radius:6px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:600;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:3px;}
.nav-btn svg{width:14px;height:14px;opacity:0.5;transition:all 0.2s;}
.nav-btn.active{background:linear-gradient(135deg,rgba(212,165,62,0.12),rgba(212,165,62,0.06));color:var(--gold);border:1px solid var(--border-gold);box-shadow:0 0 12px rgba(212,165,62,0.1);}
.nav-btn.active svg{opacity:1;color:var(--gold);}

/* PANELS */
.panel{display:none;flex:1;flex-direction:column;}
.panel.active{display:flex;}

/* CHAT */
.chat-messages{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:14px;max-height:calc(100vh - 230px);}
.chat-messages::-webkit-scrollbar{width:2px;}
.chat-messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.msg{display:flex;flex-direction:column;gap:4px;animation:fadeUp 0.25s ease;}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.msg.nexa{align-items:flex-start;}
.msg.user{align-items:flex-end;}
.msg-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:0 4px;color:var(--text-dim);}
.msg.nexa .msg-label{color:var(--gold-dim);}
.msg-bubble{max-width:90%;padding:11px 14px;font-size:14px;line-height:1.55;}
.msg.nexa .msg-bubble{background:var(--surface2);border:1px solid var(--border);border-left:2px solid var(--gold);color:var(--text);border-radius:2px 10px 10px 10px;}
.msg.user .msg-bubble{background:linear-gradient(135deg,rgba(212,165,62,0.12),rgba(212,165,62,0.06));border:1px solid var(--border-gold);color:var(--text-bright);border-radius:10px 2px 10px 10px;}
.msg-bubble .tag{display:inline-block;background:rgba(212,165,62,0.1);border:1px solid rgba(212,165,62,0.25);color:var(--gold);font-family:'Share Tech Mono',monospace;font-size:10px;padding:1px 6px;border-radius:3px;margin:2px 3px 2px 0;letter-spacing:1px;}
.typing{display:flex;gap:5px;align-items:center;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-left:2px solid var(--gold);border-radius:2px 10px 10px 10px;width:fit-content;}
.typing span{width:5px;height:5px;border-radius:50%;background:var(--gold);animation:typeDot 1.2s ease-in-out infinite;opacity:0.4;}
.typing span:nth-child(2){animation-delay:0.2s}.typing span:nth-child(3){animation-delay:0.4s}
@keyframes typeDot{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
.chat-input-area{padding:10px 18px 18px;border-top:1px solid var(--border);background:rgba(10,10,10,0.95);}
.quick-prompts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.qp-btn{background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text-dim);cursor:pointer;letter-spacing:0.5px;transition:all 0.2s;white-space:nowrap;}
.qp-btn:hover{border-color:var(--border-gold);color:var(--gold);background:rgba(212,165,62,0.05);}
.input-row{display:flex;gap:10px;align-items:flex-end;}
.chat-input{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text-bright);font-family:'Rajdhani',sans-serif;font-size:15px;resize:none;min-height:44px;max-height:100px;line-height:1.4;outline:none;transition:border-color 0.2s;}
.chat-input:focus{border-color:var(--border-gold);}
.chat-input::placeholder{color:var(--text-dim);}
.send-btn{width:44px;height:44px;background:linear-gradient(135deg,rgba(212,165,62,0.15),rgba(212,165,62,0.08));border:1px solid var(--border-gold);border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}
.send-btn:active{background:rgba(212,165,62,0.25);transform:scale(0.95);}
.send-btn svg{width:18px;height:18px;color:var(--gold);}

/* VOICE ORB */
.voice-orb{display:none;align-items:center;justify-content:center;gap:3px;padding:8px 14px;margin:0 18px 10px;background:rgba(212,165,62,0.05);border:1px solid var(--border-gold);border-radius:8px;}
.voice-orb.active{display:flex;}
.voice-bar{width:3px;border-radius:2px;background:var(--gold);animation:voiceBar 0.8s ease-in-out infinite;}
.voice-bar:nth-child(1){height:8px;animation-delay:0s}.voice-bar:nth-child(2){height:14px;animation-delay:0.1s}.voice-bar:nth-child(3){height:20px;animation-delay:0.2s}.voice-bar:nth-child(4){height:14px;animation-delay:0.3s}.voice-bar:nth-child(5){height:8px;animation-delay:0.4s}.voice-bar:nth-child(6){height:16px;animation-delay:0.15s}.voice-bar:nth-child(7){height:10px;animation-delay:0.25s}
@keyframes voiceBar{0%,100%{transform:scaleY(0.4);opacity:0.5}50%{transform:scaleY(1);opacity:1}}
.voice-label{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--gold-dim);letter-spacing:2px;margin-left:8px;}

/* STATUS PANEL */
.status-panel{padding:16px 18px;overflow-y:auto;flex:1;}
.status-panel::-webkit-scrollbar{width:2px;}
.status-panel::-webkit-scrollbar-thumb{background:var(--border);}
.section-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
.section-label::after{content:'';flex:1;height:1px;background:var(--border);}

/* NORTH STAR */
.north-star-card{background:var(--surface2);border:1px solid var(--border-gold);border-radius:10px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden;}
.north-star-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),var(--gold-light),transparent);opacity:0.6;}
.ns-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;gap:10px;}
.ns-star-title{font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:var(--gold);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;}
.ns-goal-text{font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:600;color:var(--text-bright);line-height:1.4;}
.ns-edit-btn{background:none;border:1px solid var(--border);border-radius:5px;padding:3px 8px;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-dim);cursor:pointer;transition:all 0.2s;flex-shrink:0;}
.ns-edit-btn:hover{border-color:var(--border-gold);color:var(--gold);}
.ns-date{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--gold-dim);margin-top:5px;}
.ns-streak{display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:7px;}
.streak-count{font-family:'Cinzel',serif;font-size:22px;font-weight:700;color:var(--gold);line-height:1;}
.streak-info{flex:1;}
.streak-label{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-dim);letter-spacing:1px;}
.streak-sub{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);margin-top:2px;}

/* TODAY CARD */
.today-card{background:linear-gradient(135deg,rgba(212,165,62,0.06),rgba(212,165,62,0.02));border:1px solid var(--border-gold);border-radius:10px;padding:14px 16px;margin-bottom:12px;}
.today-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:8px;}
.today-action-text{font-size:15px;font-weight:600;color:var(--text-bright);line-height:1.4;margin-bottom:10px;}
.today-action-text.empty{color:var(--text-dim);font-style:italic;font-size:13px;}
.today-btns{display:flex;gap:8px;flex-wrap:wrap;}
.today-btn{padding:7px 14px;border-radius:6px;font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;transition:all 0.2s;border:1px solid;}
.today-btn.done-btn{background:rgba(92,184,92,0.1);border-color:rgba(92,184,92,0.3);color:var(--success);}
.today-btn.done-btn.completed{background:rgba(92,184,92,0.2);}
.today-btn.nexa-btn{background:rgba(212,165,62,0.08);border-color:var(--border-gold);color:var(--gold);}

/* MILESTONES */
.milestone-item{background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px;}
.milestone-item.ms-active{border-color:var(--border-gold);}
.milestone-header{display:flex;align-items:center;gap:8px;cursor:pointer;}
.milestone-num{font-family:'Cinzel',serif;font-size:12px;color:var(--text-dim);width:18px;flex-shrink:0;}
.milestone-item.ms-active .milestone-num{color:var(--gold);}
.milestone-name{flex:1;font-size:13px;font-weight:600;color:var(--text-bright);}
.ms-count{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);}
.ms-badge{font-family:'Share Tech Mono',monospace;font-size:8px;padding:2px 6px;border-radius:3px;letter-spacing:1px;}
.ms-badge-active{background:rgba(212,165,62,0.1);color:var(--gold);border:1px solid var(--border-gold);}
.ms-badge-done{background:rgba(92,184,92,0.1);color:var(--success);border:1px solid rgba(92,184,92,0.25);}
.ms-chev{font-size:10px;color:var(--text-dim);transition:transform 0.2s;}
.ms-chev.open{transform:rotate(90deg);}
.ms-actions{display:none;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04);margin-top:8px;}
.ms-actions.open{display:block;}
.action-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03);}
.action-item:last-child{border-bottom:none;}
.action-check{width:16px;height:16px;border:1px solid var(--border);border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;}
.action-check.done{background:rgba(92,184,92,0.15);border-color:rgba(92,184,92,0.4);}
.action-check.done::after{content:'✓';font-size:10px;color:var(--success);}
.action-text{flex:1;font-size:13px;color:var(--text);line-height:1.3;}
.action-text.done{text-decoration:line-through;color:var(--text-dim);}
.action-small-btn{background:none;border:none;font-family:'Share Tech Mono',monospace;font-size:9px;cursor:pointer;padding:2px 5px;border-radius:3px;}
.add-action-row{display:flex;gap:6px;margin-top:8px;}
.add-action-input{flex:1;background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:5px;padding:6px 8px;color:var(--text-bright);font-family:'Rajdhani',sans-serif;font-size:13px;outline:none;}
.add-action-input:focus{border-color:var(--border-gold);}
.add-action-btn{padding:6px 10px;background:rgba(212,165,62,0.08);border:1px solid var(--border-gold);border-radius:5px;color:var(--gold);font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;}
.ms-footer-btns{display:flex;gap:6px;margin-top:8px;}
.ms-footer-btn{flex:1;padding:5px;background:none;border-radius:5px;font-family:'Share Tech Mono',monospace;font-size:9px;cursor:pointer;transition:all 0.2s;}
.ms-footer-btn.edit{border:1px solid var(--border);color:var(--text-dim);}
.ms-footer-btn.del{border:1px solid rgba(224,85,85,0.2);color:var(--warn);opacity:0.6;}
.add-milestone-btn{width:100%;padding:8px;background:none;border:1px dashed var(--border);border-radius:7px;color:var(--text-dim);font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;transition:all 0.2s;margin-top:4px;}
.add-milestone-btn:hover{border-color:var(--border-gold);color:var(--gold);}

/* FINANCE CARD */
.finance-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden;}
.finance-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0.35;}
.finance-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.finance-card-title{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;}
.finance-sync-meta{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);}
.finance-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;}
.finance-stat{background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;}
.finance-stat-label{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
.finance-stat-value{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:var(--gold);line-height:1;}
.finance-stat-value.warn{color:var(--warn);}
.finance-stat-value.ok{color:var(--success);}
.finance-stat-sub{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);margin-top:3px;}
.finance-debt-section{margin-top:8px;}
.finance-debt-header{display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;}
.finance-debt-row{padding:7px 0;border-top:1px solid rgba(255,255,255,0.04);}
.finance-debt-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.finance-debt-name{font-size:13px;font-weight:600;color:var(--text);}
.finance-debt-balance{font-family:'Cinzel',serif;font-size:13px;color:var(--warn);}
.finance-debt-meta{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);margin-top:2px;}
.finance-bar-bg{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;margin-top:4px;}
.finance-bar-fill{height:100%;background:linear-gradient(90deg,var(--warn),rgba(224,85,85,0.35));border-radius:2px;transition:width 0.6s ease;}
.finance-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:18px 0;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text-dim);letter-spacing:1px;}
.finance-loading-dots span{width:4px;height:4px;border-radius:50%;background:var(--gold);animation:typeDot 1.2s ease-in-out infinite;opacity:0.4;display:inline-block;margin:0 2px;}
.finance-loading-dots span:nth-child(2){animation-delay:0.2s}.finance-loading-dots span:nth-child(3){animation-delay:0.4s}
.finance-error{font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text-dim);text-align:center;padding:14px 0;line-height:1.7;}

/* TRADING */
.trading-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px;}
.trading-card-title{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:14px;}
.trade-counters{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
.counter-item{background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;text-align:center;}
.counter-label{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
.counter-value{font-family:'Cinzel',serif;font-size:24px;font-weight:700;color:var(--text-bright);line-height:1;}
.counter-value.gold{color:var(--gold);}
.counter-value.warn{color:var(--warn);}
.counter-value.ok{color:var(--success);}
.trade-btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;}
.trade-btn{padding:8px 6px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:6px;color:var(--text-dim);font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;transition:all 0.2s;text-align:center;letter-spacing:0.5px;}
.trade-btn.win:hover,.trade-btn.win.selected{background:rgba(92,184,92,0.12);border-color:rgba(92,184,92,0.3);color:var(--success);}
.trade-btn.loss:hover,.trade-btn.loss.selected{background:rgba(224,85,85,0.12);border-color:rgba(224,85,85,0.3);color:var(--warn);}
.trade-btn.be:hover,.trade-btn.be.selected{background:rgba(212,165,62,0.1);border-color:var(--border-gold);color:var(--gold);}
.rules-check{display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;}
.rules-label{font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text-dim);letter-spacing:1px;}
.rules-toggle{display:flex;gap:6px;}
.toggle-btn{padding:4px 10px;border-radius:4px;font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-dim);transition:all 0.2s;letter-spacing:1px;}
.toggle-btn.yes.active{background:rgba(92,184,92,0.12);border-color:rgba(92,184,92,0.3);color:var(--success);}
.toggle-btn.no.active{background:rgba(224,85,85,0.12);border-color:rgba(224,85,85,0.3);color:var(--warn);}

/* DEBT */
.debt-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px;}
.debt-item{margin-bottom:12px;}
.debt-item:last-child{margin-bottom:0;}
.debt-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.debt-name{font-size:14px;font-weight:600;color:var(--text-bright);}
.debt-balance{font-family:'Cinzel',serif;font-size:14px;color:var(--gold);}
.debt-bar-bg{height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;}
.debt-bar-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:2px;transition:width 0.5s ease;}
.debt-meta{display:flex;justify-content:space-between;margin-top:4px;}
.debt-meta span{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-dim);letter-spacing:0.5px;}
.debt-input-row{display:flex;gap:8px;margin-top:10px;}
.debt-input{flex:1;background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:6px;padding:7px 10px;color:var(--text-bright);font-family:'Share Tech Mono',monospace;font-size:12px;outline:none;}
.debt-input:focus{border-color:var(--border-gold);}
.debt-update-btn{padding:7px 12px;background:rgba(212,165,62,0.08);border:1px solid var(--border-gold);border-radius:6px;color:var(--gold);font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;white-space:nowrap;}

/* PRIORITY */
.priority-item{display:flex;align-items:center;gap:12px;padding:10px 13px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;position:relative;overflow:hidden;}
.priority-item::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--border);}
.priority-item.p-active{border-color:var(--border-gold);background:rgba(212,165,62,0.04);}
.priority-item.p-active::before{background:var(--gold);}
.p-num{font-family:'Cinzel',serif;font-size:16px;font-weight:700;color:var(--text-dim);width:24px;flex-shrink:0;text-align:center;}
.priority-item.p-active .p-num{color:var(--gold);}
.p-info{flex:1;}
.p-name{font-size:14px;font-weight:600;color:var(--text-bright);}
.p-sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-dim);margin-top:2px;}
.p-badge{font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 7px;border-radius:4px;letter-spacing:1px;white-space:nowrap;}
.b-active{background:rgba(212,165,62,0.12);color:var(--gold);border:1px solid var(--border-gold);}
.b-locked{background:rgba(224,85,85,0.08);color:var(--warn);border:1px solid rgba(224,85,85,0.15);}
.b-ongoing{background:rgba(85,85,85,0.2);color:var(--text-dim);border:1px solid var(--border);}
.b-rebuild{background:rgba(91,155,213,0.1);color:var(--info);border:1px solid rgba(91,155,213,0.2);}

/* EXPLORE */
.explore-panel{display:flex;flex-direction:column;flex:1;overflow:hidden;}
.explore-modes{padding:14px 18px 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;flex-shrink:0;}
.exp-mode{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 8px;cursor:pointer;transition:all 0.2s;text-align:center;}
.exp-mode.active{border-color:var(--border-gold);background:rgba(212,165,62,0.06);}
.exp-icon{font-size:18px;margin-bottom:4px;}
.exp-name{font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text-bright);text-transform:uppercase;}
.exp-desc{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--text-dim);margin-top:2px;}
.exp-mode.active .exp-name{color:var(--gold);}
.explore-context{padding:10px 18px;border-bottom:1px solid var(--border);flex-shrink:0;}
.explore-context-text{font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--gold-dim);letter-spacing:1px;line-height:1.5;}
.explore-messages{flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px;}
.explore-messages::-webkit-scrollbar{width:2px;}
.explore-messages::-webkit-scrollbar-thumb{background:var(--border);}
.explore-input-area{padding:10px 18px 18px;border-top:1px solid var(--border);background:rgba(10,10,10,0.95);flex-shrink:0;}

/* MODALS */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:500;align-items:flex-end;justify-content:center;}
.modal-overlay.open{display:flex;}
.modal-sheet{background:#111;border:1px solid var(--border);border-top:2px solid var(--gold);border-radius:14px 14px 0 0;padding:24px 20px 40px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;}
.modal-title{font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:var(--text-bright);letter-spacing:3px;margin-bottom:4px;}
.modal-sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--gold-dim);letter-spacing:2px;margin-bottom:20px;}
.modal-label{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;margin-top:14px;}
.modal-input{width:100%;background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:7px;padding:10px 12px;color:var(--text-bright);font-family:'Rajdhani',sans-serif;font-size:14px;outline:none;}
.modal-input:focus{border-color:var(--border-gold);}
.modal-textarea{width:100%;background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:7px;padding:10px 12px;color:var(--text-bright);font-family:'Rajdhani',sans-serif;font-size:14px;outline:none;resize:none;min-height:80px;}
.modal-textarea:focus{border-color:var(--border-gold);}
.modal-actions{display:flex;gap:8px;margin-top:20px;}
.modal-save{flex:1;padding:11px;background:linear-gradient(135deg,rgba(212,165,62,0.15),rgba(212,165,62,0.07));border:1px solid var(--border-gold);border-radius:8px;color:var(--gold);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;cursor:pointer;}
.modal-cancel{padding:11px 16px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);font-family:'Rajdhani',sans-serif;font-size:13px;cursor:pointer;}

/* PLAN OVERLAY */
.plan-overlay{display:none;position:fixed;inset:0;background:var(--bg);z-index:600;flex-direction:column;}
.plan-overlay.open{display:flex;}
.plan-header{padding:14px 18px;border-bottom:1px solid var(--border);background:rgba(10,10,10,0.97);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.plan-title{font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:var(--text-bright);letter-spacing:3px;}
.plan-title span{color:var(--gold);}
.plan-sub{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--gold-dim);letter-spacing:2px;margin-top:3px;}
.plan-close{background:none;border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--text-dim);font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;}
.plan-close:hover{border-color:var(--border-gold);color:var(--gold);}
.plan-messages{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:14px;}
.plan-messages::-webkit-scrollbar{width:2px;}
.plan-messages::-webkit-scrollbar-thumb{background:var(--border);}
.plan-input-area{padding:10px 18px 24px;border-top:1px solid var(--border);background:rgba(10,10,10,0.95);flex-shrink:0;}
/* Plan preview card */
.plan-preview{background:linear-gradient(135deg,rgba(212,165,62,0.07),rgba(212,165,62,0.02));border:1px solid var(--border-gold);border-radius:10px;padding:16px;margin:0 18px 12px;flex-shrink:0;}
.plan-preview-title{font-family:'Cinzel',serif;font-size:11px;color:var(--gold);letter-spacing:2px;margin-bottom:10px;}
.plan-preview-goal{font-size:14px;font-weight:600;color:var(--text-bright);margin-bottom:8px;line-height:1.4;}
.plan-preview-ms{font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text-dim);margin:3px 0;padding-left:8px;border-left:2px solid var(--border-gold);}
.plan-actions-row{display:flex;gap:8px;margin-top:12px;}
.plan-save-btn{flex:1;padding:10px;background:linear-gradient(135deg,rgba(212,165,62,0.15),rgba(212,165,62,0.07));border:1px solid var(--border-gold);border-radius:8px;color:var(--gold);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:2px;cursor:pointer;}
.plan-discard-btn{padding:10px 14px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);font-family:'Share Tech Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px;}
</style>
</head>
<body>

<!-- API KEY MODAL -->
<div id="keyModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:1000;align-items:center;justify-content:center;padding:20px;">
  <div style="background:#111;border:1px solid #2a2a2a;border-top:2px solid #D4A53E;border-radius:12px;padding:26px;max-width:380px;width:100%;">
    <div style="font-family:Cinzel,serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:4px;margin-bottom:4px;">NEXA <span style='color:#D4A53E'>OS</span></div>
    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(212,165,62,0.5);letter-spacing:3px;margin-bottom:20px;text-transform:uppercase;">Authorization Required</div>
    <div style="font-family:Rajdhani,sans-serif;font-size:14px;color:#c8c8c8;margin-bottom:18px;line-height:1.6;">Enter your Anthropic API key to activate the system. Stored in this browser session only.</div>
    <input id="apiKeyInput" type="password" placeholder="sk-ant-api03-..." style="width:100%;background:rgba(0,0,0,0.5);border:1px solid #2a2a2a;border-radius:6px;padding:10px 12px;color:#fff;font-family:'Share Tech Mono',monospace;font-size:12px;outline:none;margin-bottom:8px;box-sizing:border-box;">
    <div id="keyError" style="display:none;font-family:'Share Tech Mono',monospace;font-size:10px;color:#e05555;margin-bottom:8px;">⚠ Invalid key format</div>
    <button onclick="saveApiKey()" style="width:100%;padding:12px;background:linear-gradient(135deg,rgba(212,165,62,0.15),rgba(212,165,62,0.07));border:1px solid rgba(212,165,62,0.3);border-radius:8px;color:#D4A53E;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;">ACTIVATE SYSTEM</button>
    <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#444;margin-top:14px;text-align:center;">console.anthropic.com &rarr; API Keys</div>
    <div id="storedKeyHint" style="display:none;font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(212,165,62,0.4);margin-top:8px;text-align:center;"></div>
    <button onclick="clearStoredKey()" style="display:block;margin:8px auto 0;background:none;border:none;font-family:'Share Tech Mono',monospace;font-size:9px;color:#333;cursor:pointer;letter-spacing:1px;">clear saved key</button>
  </div>
</div>

<!-- NORTH STAR MODAL -->
<div class="modal-overlay" id="nsModal">
  <div class="modal-sheet">
    <div class="modal-title">NORTH STAR</div>
    <div class="modal-sub">Your one massive goal</div>
    <div class="modal-label">The Goal</div>
    <textarea class="modal-textarea" id="nsGoalInput" placeholder="e.g. Be completely debt free and trading full time by end of 2026"></textarea>
    <div class="modal-label">Target Date</div>
    <input class="modal-input" id="nsDateInput" type="date">
    <div class="modal-actions">
      <button class="modal-cancel" onclick="closeModal('nsModal')">Cancel</button>
      <button class="modal-save" onclick="saveNorthStar()">SAVE</button>
    </div>
  </div>
</div>

<!-- PLAN OVERLAY -->
<div class="plan-overlay" id="planOverlay">
  <div class="plan-header">
    <div>
      <div class="plan-title">PLAN WITH <span>NEXA</span></div>
      <div class="plan-sub">Goal Architect Mode — talk it out, build your system</div>
    </div>
    <button class="plan-close" onclick="closePlan()">✕ Close</button>
  </div>
  <div class="plan-messages" id="planMessages"></div>
  <div class="plan-preview" id="planPreview" style="display:none;">
    <div class="plan-preview-title">⭐ PROPOSED PLAN</div>
    <div class="plan-preview-goal" id="planPreviewGoal"></div>
    <div id="planPreviewMilestones"></div>
    <div class="plan-actions-row">
      <button class="plan-save-btn" onclick="savePlanToSystem()">✓ SAVE TO SYSTEM</button>
      <button class="plan-discard-btn" onclick="discardPlan()">Keep talking</button>
    </div>
  </div>
  <div class="plan-input-area">
    <div class="input-row">
      <textarea class="chat-input" id="planInput" placeholder="Tell NEXA what you're building toward..." rows="1" onkeydown="handlePlanKey(event)" oninput="autoResize(this)"></textarea>
      <button class="send-btn" onclick="sendPlanMessage()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>
</div>

<!-- MILESTONE MODAL -->
<div class="modal-overlay" id="msModal">
  <div class="modal-sheet">
    <div class="modal-title">MILESTONE</div>
    <div class="modal-sub">A step toward your North Star</div>
    <div class="modal-label">Milestone Name</div>
    <input class="modal-input" id="msNameInput" placeholder="e.g. Pay off all credit card debt">
    <div class="modal-actions">
      <button class="modal-cancel" onclick="closeModal('msModal')">Cancel</button>
      <button class="modal-save" onclick="saveMilestone()">SAVE</button>
    </div>
  </div>
</div>

<div class="app">
  <!-- HEADER -->
  <div class="header">
    <div class="header-top">
      <div class="logo">
        <div class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#D4A53E" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <div>
          <div class="logo-name">NEX<span>A</span> OS</div>
          <div class="logo-sub">Strategic Operating System</div>
        </div>
      </div>
      <div class="header-right">
        <button class="hdr-btn" id="voiceBtn" onclick="toggleVoice()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="voiceIcon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
        <button class="hdr-btn" id="briefBtn" onclick="runMorningBriefing()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          BRIEF
        </button>
        <button class="hdr-btn" id="syncBtn" onclick="syncFinanceData()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          SYNC
        </button>
        <div class="status-indicator"><div class="status-dot"></div>Online</div>
      </div>
    </div>
    <div class="nav">
      <button class="nav-btn active" onclick="switchPanel('command',this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Command
      </button>
      <button class="nav-btn" onclick="switchPanel('goals',this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>Goals
      </button>
      <button class="nav-btn" onclick="switchPanel('finance',this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Finance
      </button>
      <button class="nav-btn" onclick="switchPanel('explore',this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Explore
      </button>
    </div>
  </div>

  <!-- COMMAND PANEL -->
  <div class="panel active" id="panel-command">
    <div class="chat-messages" id="chatMessages">
      <div class="msg nexa">
        <div class="msg-label">Nexa OS</div>
        <div class="msg-bubble">
          System online. I am Nexa OS — your strategic operating system.<br><br>
          <span class="tag">BRIEF</span> Morning briefing with your real data<br>
          <span class="tag">Goals</span> North Star, milestones, daily actions<br>
          <span class="tag">Finance</span> Live data, trading log<br>
          <span class="tag">Explore</span> Research, strategy, big ideas<br><br>
          Operate from data. Not assumption.
        </div>
      </div>
    </div>
    <div class="voice-orb" id="voiceOrb">
      <div class="voice-bar"></div><div class="voice-bar"></div><div class="voice-bar"></div>
      <div class="voice-bar"></div><div class="voice-bar"></div><div class="voice-bar"></div><div class="voice-bar"></div>
      <span class="voice-label">SPEAKING</span>
    </div>
    <div class="chat-input-area">
      <div class="quick-prompts">
        <button class="qp-btn" onclick="quickPrompt('Daily check-in')">Daily check-in</button>
        <button class="qp-btn" onclick="quickPrompt('What should my one action be today?')">Today's action</button>
        <button class="qp-btn" onclick="quickPrompt('Priority check')">Priority check</button>
        <button class="qp-btn" onclick="quickPrompt('Give me a full finance summary')">Finance summary</button>
        <button class="qp-btn" onclick="quickPrompt('I want to break a rule')">Rule override</button>
      </div>
      <div class="input-row">
        <textarea class="chat-input" id="chatInput" placeholder="Talk to Nexa..." rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
        <button class="send-btn" onclick="sendMessage()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  </div>

  <!-- GOALS PANEL -->
  <div class="panel" id="panel-goals">
    <div class="status-panel">

      <div class="section-label">North Star</div>
      <div class="north-star-card">
        <div class="ns-header">
          <div style="flex:1;">
            <div class="ns-star-title">⭐ Massive Goal</div>
            <div class="ns-goal-text" id="nsGoalDisplay">Tap Edit to set your North Star.</div>
            <div class="ns-date" id="nsDateDisplay"></div>
          </div>
          <button class="ns-edit-btn" onclick="openNsModal()">Edit</button>
        </div>
        <div class="ns-streak">
          <span style="font-size:20px;">🔥</span>
          <div class="streak-count" id="streakCount">0</div>
          <div class="streak-info">
            <div class="streak-label">Day Streak</div>
            <div class="streak-sub" id="streakSub">No actions completed yet</div>
          </div>
        </div>
      </div>

      <div class="section-label">Today's Move</div>
      <div class="today-card">
        <div class="today-label">One thing to move forward</div>
        <div class="today-action-text empty" id="todayActionText">No action selected — pick one from milestones below or ask NEXA.</div>
        <div class="today-btns">
          <button class="today-btn done-btn" id="todayDoneBtn" onclick="completeTodayAction()">✓ Done for today</button>
          <button class="today-btn nexa-btn" onclick="askNexaForAction()">✦ Ask NEXA</button>
        </div>
      </div>

      <div class="section-label">Milestones</div>
      <div id="milestonesContainer"></div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="add-milestone-btn" style="flex:1;" onclick="openMsModal(-1)">+ Add Milestone</button>
        <button class="add-milestone-btn" style="flex:1.4;border-color:var(--border-gold);color:var(--gold);" onclick="openPlan()">✦ Plan with NEXA</button>
      </div>

      <div style="height:24px;"></div>
    </div>
  </div>

  <!-- FINANCE PANEL -->
  <div class="panel" id="panel-finance">
    <div class="status-panel">

      <div class="section-label">Financial Snapshot</div>
      <div class="finance-card">
        <div class="finance-card-header">
          <div class="finance-card-title">Nexa Finance — Live</div>
          <div class="finance-sync-meta" id="financeSyncMeta">Not synced</div>
        </div>
        <div id="financeContent">
          <div class="finance-loading"><span>Connecting to Nexa Finance</span><div class="finance-loading-dots"><span></span><span></span><span></span></div></div>
        </div>
      </div>

      <div class="section-label">Today's Trading</div>
      <div class="trading-card">
        <div class="trading-card-title">Session Log — 30-Day Rebuild</div>
        <div class="trade-counters">
          <div class="counter-item"><div class="counter-label">Trades Taken</div><div class="counter-value gold" id="tradeCount">0</div></div>
          <div class="counter-item"><div class="counter-label">Remaining</div><div class="counter-value ok" id="tradeRemaining">2</div></div>
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;">Log result</div>
        <div class="trade-btns">
          <div class="trade-btn win" onclick="logTrade('win')">✓ Win</div>
          <div class="trade-btn loss" onclick="logTrade('loss')">✗ Loss</div>
          <div class="trade-btn be" onclick="logTrade('be')">— B/E</div>
        </div>
        <div class="rules-check">
          <div class="rules-label">Rules Followed?</div>
          <div class="rules-toggle">
            <button class="toggle-btn yes" id="rulesYes" onclick="setRules(true)">Yes</button>
            <button class="toggle-btn no" id="rulesNo" onclick="setRules(false)">No</button>
          </div>
        </div>
        <div id="stopWarning" style="display:none;margin-top:10px;padding:8px 10px;background:rgba(224,85,85,0.1);border:1px solid rgba(224,85,85,0.25);border-radius:6px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--warn);letter-spacing:0.5px;line-height:1.5;"></div>
      </div>

      <div style="height:24px;"></div>
    </div>
  </div>

  <!-- EXPLORE PANEL -->
  <div class="panel" id="panel-explore">
    <div class="explore-panel">
      <div class="explore-modes">
        <div class="exp-mode active" onclick="setExploreMode('business',this)"><div class="exp-icon">📊</div><div class="exp-name">Business</div><div class="exp-desc">Research & ideas</div></div>
        <div class="exp-mode" onclick="setExploreMode('strategy',this)"><div class="exp-icon">♟</div><div class="exp-name">Strategy</div><div class="exp-desc">Think it through</div></div>
        <div class="exp-mode" onclick="setExploreMode('explore',this)"><div class="exp-icon">🌌</div><div class="exp-name">Explore</div><div class="exp-desc">Big picture</div></div>
      </div>
      <div class="explore-context"><div class="explore-context-text" id="exploreContextText">Mode: Business Research — Everbee, Meta Ads, POD analysis, opportunity filtering against your stack.</div></div>
      <div class="explore-messages" id="exploreMessages">
        <div class="msg nexa"><div class="msg-label">Nexa OS</div><div class="msg-bubble">Business mode active. Drop a product niche, paste Everbee data, or ask me to evaluate anything against your priority stack.</div></div>
      </div>
      <div class="voice-orb" id="voiceOrbExplore">
        <div class="voice-bar"></div><div class="voice-bar"></div><div class="voice-bar"></div>
        <div class="voice-bar"></div><div class="voice-bar"></div><div class="voice-bar"></div><div class="voice-bar"></div>
        <span class="voice-label">SPEAKING</span>
      </div>
      <div class="explore-input-area">
        <div class="input-row">
          <textarea class="chat-input" id="exploreInput" placeholder="Ask, research, explore..." rows="1" onkeydown="handleExploreKey(event)" oninput="autoResize(this)"></textarea>
          <button class="send-btn" onclick="sendExplore()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
// ══ STORAGE ══
function save(k,v){try{localStorage.setItem("nexa_"+k,JSON.stringify(v));return;}catch(e){}try{sessionStorage.setItem("nexa_"+k,JSON.stringify(v));}catch(e){}}
function load(k,d){try{const v=localStorage.getItem("nexa_"+k)||sessionStorage.getItem("nexa_"+k);return v?JSON.parse(v):d;}catch(e){return d;}}

// ══ VOICE ══
let voiceEnabled=load('voice',false);
function toggleVoice(){voiceEnabled=!voiceEnabled;save('voice',voiceEnabled);updateVoiceUI();if(!voiceEnabled)speechSynthesis.cancel();}
function updateVoiceUI(){
  const btn=document.getElementById('voiceBtn');
  btn.classList.toggle('active',voiceEnabled);
  btn.innerHTML=voiceEnabled
    ?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg> ON`
    :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
}
function speak(text,orbId='voiceOrb'){
  if(!voiceEnabled)return;
  speechSynthesis.cancel();
  const clean=text.replace(/<[^>]+>/g,'').replace(/\*\*/g,'').replace(/\*/g,'').replace(/#{1,3} /g,'').trim();
  const u=new SpeechSynthesisUtterance(clean);
  u.rate=0.95;u.pitch=1.0;
  const voices=speechSynthesis.getVoices();
  const pref=voices.find(v=>v.name.includes('Google')||v.name.includes('Samantha')||v.name.includes('Alex')||v.name.includes('Daniel'));
  if(pref)u.voice=pref;
  const orb=document.getElementById(orbId);
  u.onstart=()=>{if(orb)orb.classList.add('active');};
  u.onend=()=>{if(orb)orb.classList.remove('active');};
  u.onerror=()=>{if(orb)orb.classList.remove('active');};
  setTimeout(()=>speechSynthesis.speak(u),150);
}

// ══ NORTH STAR ══
let northStar=load('northStar',{goal:'',date:''});
let milestones=load('milestones',[]);
let streak=load('streak',{count:0,lastDate:'',lastAction:''});
let todayAction=load('todayAction',{text:'',completed:false,date:''});
function todayStr(){return new Date().toISOString().split('T')[0];}

function openNsModal(){document.getElementById('nsGoalInput').value=northStar.goal;document.getElementById('nsDateInput').value=northStar.date;document.getElementById('nsModal').classList.add('open');}
function saveNorthStar(){northStar.goal=document.getElementById('nsGoalInput').value.trim();northStar.date=document.getElementById('nsDateInput').value;save('northStar',northStar);closeModal('nsModal');renderNorthStar();}
function renderNorthStar(){
  document.getElementById('nsGoalDisplay').textContent=northStar.goal||'Tap Edit to set your North Star.';
  if(northStar.date){const d=new Date(northStar.date+'T00:00:00');const days=Math.ceil((d-new Date())/86400000);document.getElementById('nsDateDisplay').textContent=`Target: ${d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · ${days>0?days+' days away':'Past due'}`;}
  else document.getElementById('nsDateDisplay').textContent='';
  document.getElementById('streakCount').textContent=streak.count;
  document.getElementById('streakSub').textContent=streak.lastAction?'Last: '+streak.lastAction.slice(0,28)+'...':'No actions completed yet';
}

// ══ MILESTONES ══
let editingMsIdx=-1;
function openMsModal(idx){editingMsIdx=idx;document.getElementById('msNameInput').value=idx>=0?milestones[idx].name:'';document.getElementById('msModal').classList.add('open');}
function saveMilestone(){
  const name=document.getElementById('msNameInput').value.trim();if(!name)return;
  if(editingMsIdx>=0)milestones[editingMsIdx].name=name;
  else milestones.push({id:Date.now(),name,actions:[]});
  save('milestones',milestones);closeModal('msModal');renderMilestones();
}
function deleteMilestone(i){if(!confirm('Delete this milestone?'))return;milestones.splice(i,1);save('milestones',milestones);renderMilestones();}
function toggleMs(i){const a=document.getElementById('msa-'+i),c=document.getElementById('msc-'+i);a.classList.toggle('open');c.classList.toggle('open');}
function addAction(msI){
  const inp=document.getElementById('ai-'+msI),text=inp.value.trim();if(!text)return;
  milestones[msI].actions.push({id:Date.now(),text,done:false});save('milestones',milestones);inp.value='';
  renderMilestones();setTimeout(()=>{const a=document.getElementById('msa-'+msI),c=document.getElementById('msc-'+msI);if(a&&!a.classList.contains('open')){a.classList.add('open');c.classList.add('open');}},50);
}
function toggleAction(mi,ai){milestones[mi].actions[ai].done=!milestones[mi].actions[ai].done;save('milestones',milestones);renderMilestones();}
function deleteAction(mi,ai){milestones[mi].actions.splice(ai,1);save('milestones',milestones);renderMilestones();}
function setTodayAction(text){todayAction={text,completed:false,date:todayStr()};save('todayAction',todayAction);renderTodayAction();}

function renderMilestones(){
  const c=document.getElementById('milestonesContainer');
  if(!milestones.length){c.innerHTML=`<div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text-dim);text-align:center;padding:14px 0;">No milestones yet.</div>`;return;}
  c.innerHTML=milestones.map((ms,i)=>{
    const done=ms.actions.filter(a=>a.done).length,total=ms.actions.length;
    const badge=done===total&&total>0?`<span class="ms-badge ms-badge-done">Done</span>`:`<span class="ms-badge ms-badge-active">Active</span>`;
    const acts=ms.actions.map((a,ai)=>`
      <div class="action-item">
        <div class="action-check ${a.done?'done':''}" onclick="toggleAction(${i},${ai})"></div>
        <div class="action-text ${a.done?'done':''}">${escH(a.text)}</div>
        ${!a.done?`<button class="action-small-btn" style="color:var(--gold-dim)" onclick="setTodayAction('${escA(a.text)}')">→</button>`:''}
        <button class="action-small-btn" style="color:var(--text-dim)" onclick="deleteAction(${i},${ai})">✕</button>
      </div>`).join('');
    return `<div class="milestone-item ms-active" id="ms-${i}">
      <div class="milestone-header" onclick="toggleMs(${i})">
        <div class="milestone-num">${i+1}</div>
        <div class="milestone-name">${escH(ms.name)}</div>
        ${total>0?`<span class="ms-count">${done}/${total}</span>`:''}
        ${badge}
        <span class="ms-chev" id="msc-${i}">›</span>
      </div>
      <div class="ms-actions" id="msa-${i}">
        ${acts}
        <div class="add-action-row">
          <input class="add-action-input" id="ai-${i}" placeholder="Add daily action..." onkeydown="if(event.key==='Enter')addAction(${i})">
          <button class="add-action-btn" onclick="addAction(${i})">+</button>
        </div>
        <div class="ms-footer-btns">
          <button class="ms-footer-btn edit" onclick="openMsModal(${i})">Edit</button>
          <button class="ms-footer-btn del" onclick="deleteMilestone(${i})">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderTodayAction(){
  if(todayAction.date!==todayStr()&&todayAction.text){todayAction.completed=false;todayAction.date=todayStr();save('todayAction',todayAction);}
  const el=document.getElementById('todayActionText'),btn=document.getElementById('todayDoneBtn');
  if(todayAction.text){el.textContent=todayAction.text;el.classList.remove('empty');btn.textContent=todayAction.completed?'✓ Completed today':'✓ Done for today';btn.classList.toggle('completed',todayAction.completed);}
  else{el.textContent='No action selected — pick one from milestones below or ask NEXA.';el.classList.add('empty');}
}

function completeTodayAction(){
  if(!todayAction.text||todayAction.completed)return;
  todayAction.completed=true;save('todayAction',todayAction);
  const yest=new Date();yest.setDate(yest.getDate()-1);const yStr=yest.toISOString().split('T')[0];
  if(streak.lastDate===yStr)streak.count++;else if(streak.lastDate===todayStr()){}else streak.count=1;
  streak.lastDate=todayStr();streak.lastAction=todayAction.text;save('streak',streak);
  renderNorthStar();renderTodayAction();
}

async function askNexaForAction(){
  if(!NEXAKEY){showKeyModal();return;}
  switchPanel('command',document.querySelector('.nav-btn'));
  const gc=northStar.goal?`North Star: "${northStar.goal}"`:'No North Star set.';
  const mc=milestones.length?milestones.map((m,i)=>`${i+1}. ${m.name}: open actions — ${m.actions.filter(a=>!a.done).map(a=>a.text).join(', ')||'none'}`).join('; '):'No milestones.';
  sendDirect(`Based on my current financial situation and goals, what should my single most important action be today?\n\n${gc}\n${mc}`);
}

// ══ MORNING BRIEFING ══
async function runMorningBriefing(){
  if(!NEXAKEY){showKeyModal();return;}
  switchPanel('command',document.querySelector('.nav-btn'));
  const gc=northStar.goal?`North Star: "${northStar.goal}" (target: ${northStar.date||'none'})`:'No North Star set.';
  const mc=milestones.length?milestones.map((m,i)=>`Milestone ${i+1}: ${m.name} — ${m.actions.filter(a=>!a.done).length} open actions`).join(', '):'No milestones.';
  const prompt=`Good morning. Give me my daily briefing. Be sharp, direct, personal. No generic motivational fluff.

Include:
1. One sentence on where I stand financially (use my real data)
2. My North Star and whether I'm moving toward it
3. My streak — ${streak.count} days. Call it out.
4. The single most important thing to do today based on my milestones and money situation
5. One line to send me into the day

${gc}
${mc}`;
  addMessage('user','🌅 Morning Briefing');
  messages.push({role:'user',content:prompt});
  const t=showTyping();
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':NEXAKEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:500,system:NEXA_PERSONA+liveFinanceContext,messages})});
    const d=await r.json();if(!r.ok){t.remove();addMessage('nexa','⚠ Error: '+(d.error?.message||r.status));return;}
    const reply=d.content?.[0]?.text||'Error.';t.remove();addMessage('nexa',reply);messages.push({role:'assistant',content:reply});
    speak(reply,'voiceOrb');
  }catch(e){t.remove();addMessage('nexa','⚠ '+e.message);}
}

// ══ MODALS ══
function closeModal(id){document.getElementById(id).classList.remove('open');}

// ══ FINANCE SYNC ══
const FINANCE_URL='https://nexa-finance-production.up.railway.app';
let financeData=null,liveFinanceContext='';
async function syncFinanceData(){
  const btn=document.getElementById('syncBtn'),meta=document.getElementById('financeSyncMeta');
  btn.classList.add('syncing');
  try{
    const res=await fetch(`${FINANCE_URL}/api/os/summary`);if(!res.ok)throw new Error(`HTTP ${res.status}`);
    financeData=await res.json();const t=new Date();
    meta.innerHTML=`<span style="color:var(--success)">● LIVE</span> &nbsp;${t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
    renderFinanceCard();buildFinanceContext();
  }catch(e){meta.textContent='Sync failed';document.getElementById('financeContent').innerHTML=`<div class="finance-error">⚠ Could not reach Nexa Finance.<br>Check Railway is running.</div>`;}
  finally{btn.classList.remove('syncing');}
}
function renderFinanceCard(){
  if(!financeData)return;const d=financeData;
  const cash=d.cash?.total??0,wi=d.income?.totalWeekly??0,mi=d.income?.estimatedMonthly??0,s30=d.spending?.last30Days??0,td=d.debts?.totalRemaining??0,di=d.debts?.items??[],fb=d.budget?.monthlyFixedBills??0;
  const wm=wi-(fb/4.33)-(s30/4.33);
  const fs=n=>'$'+Math.abs(parseFloat(n)).toLocaleString(undefined,{maximumFractionDigits:0});
  const ff=n=>'$'+parseFloat(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  let html=`<div class="finance-grid">
    <div class="finance-stat"><div class="finance-stat-label">Total Cash</div><div class="finance-stat-value ${cash<500?'warn':''}">${fs(cash)}</div><div class="finance-stat-sub">All accounts</div></div>
    <div class="finance-stat"><div class="finance-stat-label">Weekly Income</div><div class="finance-stat-value ${wi===0?'warn':'ok'}">${fs(wi)}</div><div class="finance-stat-sub">~${fs(mi)}/mo</div></div>
    <div class="finance-stat"><div class="finance-stat-label">30-Day Spend</div><div class="finance-stat-value ${s30>mi*0.6?'warn':''}">${fs(s30)}</div><div class="finance-stat-sub">Last 30 days</div></div>
    <div class="finance-stat"><div class="finance-stat-label">Weekly Margin</div><div class="finance-stat-value ${wm<0?'warn':'ok'}">${wm<0?'-':''}${fs(wm)}</div><div class="finance-stat-sub">Est. net/week</div></div>
  </div>`;
  if(di.length){const mx=Math.max(...di.map(x=>parseFloat(x.remainingBalance)));
    html+=`<div class="finance-debt-section"><div class="finance-debt-header"><span>Debts (${di.length})</span><span style="color:var(--warn)">${ff(td)} total</span></div>${di.map(debt=>{const bal=parseFloat(debt.remainingBalance),pct=mx>0?(bal/mx)*100:100;return`<div class="finance-debt-row"><div class="finance-debt-top"><div class="finance-debt-name">${debt.name}</div><div class="finance-debt-balance">${ff(bal)}</div></div><div class="finance-debt-meta">${ff(debt.monthlyPayment)}/mo · ${debt.apr}% APR</div><div class="finance-bar-bg"><div class="finance-bar-fill" style="width:${pct}%"></div></div></div>`;}).join('')}</div>`;
  }
  document.getElementById('financeContent').innerHTML=html;
}
function buildFinanceContext(){
  if(!financeData){liveFinanceContext='';return;}const d=financeData;
  liveFinanceContext=['\n\n─── LIVE NEXA FINANCE DATA ───',`Cash: $${(d.cash?.total??0).toFixed(2)}`,`Weekly income: $${(d.income?.totalWeekly??0).toFixed(2)} | Monthly est: $${(d.income?.estimatedMonthly??0).toFixed(2)}`,`Monthly bills: $${(d.budget?.monthlyFixedBills??0).toFixed(2)}`,`Spending 30d: $${(d.spending?.last30Days??0).toFixed(2)}`,`Total debt: $${(d.debts?.totalRemaining??0).toFixed(2)} (${d.debts?.count??0} accounts)`,...(d.debts?.items??[]).map(x=>`  • ${x.name}: $${parseFloat(x.remainingBalance).toFixed(2)} @ ${x.apr}% APR`)].join('\n');
}
setInterval(()=>{if(NEXAKEY)syncFinanceData();},5*60*1000);

// ══ TRADING ══
let trades=[],debts=[];
function logTrade(r){
  if(trades.length>=2)return;trades.push(r);const c=trades.length,rem=2-c;
  document.getElementById('tradeCount').textContent=c;document.getElementById('tradeCount').className='counter-value '+(c>=2?'warn':'gold');
  document.getElementById('tradeRemaining').textContent=rem;document.getElementById('tradeRemaining').className='counter-value '+(rem===0?'warn':'ok');
  const l=trades.filter(t=>t==='loss').length,sw=document.getElementById('stopWarning');
  if(l>=2){sw.style.display='block';sw.textContent='⚠ STOP: 2 losses. Session over.';}
  else if(r==='be'){sw.style.display='block';sw.textContent='Breakeven — stop condition met.';}
  else if(c>=2){sw.style.display='block';sw.textContent='Max trades reached. Session complete.';}
  else sw.style.display='none';
}
function setRules(f){document.getElementById('rulesYes').classList.toggle('active',f);document.getElementById('rulesNo').classList.toggle('active',!f);if(!f){const sw=document.getElementById('stopWarning');sw.style.display='block';sw.textContent='⚠ Rules not followed. Log it before next session.';}}
function updateDebt(){const n=document.getElementById('debtName').value.trim(),a=document.getElementById('debtAmt').value.replace(/[$,]/g,'').trim();if(!n||!a)return;const i=debts.findIndex(d=>d.name.toLowerCase()===n.toLowerCase());if(i>=0)debts[i].balance=parseFloat(a);else debts.push({name:n,balance:parseFloat(a),starting:parseFloat(a)});document.getElementById('debtName').value='';document.getElementById('debtAmt').value='';renderDebts();}
function renderDebts(){const c=document.getElementById('debtDisplay');if(!debts.length){c.innerHTML='<div style="font-family:\'Share Tech Mono\',monospace;font-size:10px;color:var(--text-dim);text-align:center;padding:10px 0;">No debt data logged yet</div>';return;}c.innerHTML=debts.map(d=>{const pct=d.starting>0?Math.max(0,Math.min(100,(d.balance/d.starting)*100)):100,paid=d.starting-d.balance;return`<div class="debt-item"><div class="debt-header"><div class="debt-name">${d.name}</div><div class="debt-balance">$${d.balance.toLocaleString()}</div></div><div class="debt-bar-bg"><div class="debt-bar-fill" style="width:${pct}%"></div></div><div class="debt-meta"><span>Starting: $${d.starting.toLocaleString()}</span><span>Paid: $${paid.toLocaleString()}</span></div></div>`;}).join('');}

// ══ EXPLORE ══
let exploreMode='business',exploreMessages=[];
const EXP_CTX={business:'Mode: Business Research — Everbee, Meta Ads, POD analysis.',strategy:'Mode: Strategy — Decisions, plans, ideas.',explore:'Mode: Explore — AI, consciousness, the future.'};
const EXP_INTRO={business:'Business mode active. Drop a niche, paste Everbee data, or ask me to evaluate any opportunity.',strategy:"Strategy mode. What are you working through?",explore:"Explore mode. Big questions — AI, civilization, the future of work."};
const EXP_PERSONA={business:`Nexa OS Business Research mode. Analytical, structured. Filter all ideas through the priority stack.`,strategy:`Nexa OS Strategy mode. Thinking partner. Push back on weak logic.`,explore:`Nexa OS Explore mode. Deep conversation on big ideas — AI's impact, consciousness, the future.`};
function setExploreMode(m,el){exploreMode=m;exploreMessages=[];document.querySelectorAll('.exp-mode').forEach(e=>e.classList.remove('active'));el.classList.add('active');document.getElementById('exploreContextText').textContent=EXP_CTX[m];document.getElementById('exploreMessages').innerHTML='';addExploreMsg('nexa',EXP_INTRO[m]);}
async function sendExplore(){
  if(!NEXAKEY){showKeyModal();return;}
  const inp=document.getElementById('exploreInput'),text=inp.value.trim();if(!text)return;inp.value='';inp.style.height='auto';
  addExploreMsg('user',text);exploreMessages.push({role:'user',content:text});const t=showExploreTyping();
  try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':NEXAKEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1024,system:EXP_PERSONA[exploreMode]+'\n\n'+NEXA_PERSONA+liveFinanceContext,messages:exploreMessages})});const d=await r.json();if(!r.ok){t.remove();addExploreMsg('nexa','⚠ '+(d.error?.message||r.status));return;}const reply=d.content?.[0]?.text||'Error.';t.remove();addExploreMsg('nexa',reply);exploreMessages.push({role:'assistant',content:reply});if(exploreMessages.length>20)exploreMessages=exploreMessages.slice(-20);speak(reply,'voiceOrbExplore');}
  catch(e){t.remove();addExploreMsg('nexa','⚠ '+e.message);}
}
function addExploreMsg(r,t){const c=document.getElementById('exploreMessages'),m=document.createElement('div');m.className='msg '+r;m.innerHTML=`<div class="msg-label">${r==='nexa'?'Nexa OS':'You'}</div><div class="msg-bubble">${renderMarkdown(t)}</div>`;c.appendChild(m);c.scrollTop=c.scrollHeight;}
function showExploreTyping(){const c=document.getElementById('exploreMessages'),w=document.createElement('div');w.className='msg nexa';w.innerHTML='<div class="msg-label">Nexa OS</div><div class="typing"><span></span><span></span><span></span></div>';c.appendChild(w);c.scrollTop=c.scrollHeight;return w;}
function handleExploreKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendExplore();}}

// ══ NEXA ══
const NEXA_PERSONA=`You are Nexa OS — a strategic operating system. Calm, precise, analytical. No hype. No fluff. Clarity over comfort.

Life Priority Stack (non-negotiable order):
1. Debt elimination (high interest first)
2. Margin creation (monthly breathing room)
3. Capital preservation
4. Consistent trading execution
5. Long-term investing
6. AI system building
7. Creative expansion (Mythos Frame, SIVR)
8. Scaling

Trading Protocol (30-day rebuild — LOCKED): Fixed size. 5-7% risk. 2 trades max/day. 2 losses = stop. No strategy switching during drawdown.
Behavioral flags: revenge trading, scope creep, building new tools instead of executing, expanding during financial tightening.
Identity: Builder. Systems architect. Capital protector. Long-term strategist. Operator, not gambler.
Response format: Analysis → Risks → Optimization → Next Steps. Tight. Challenge weak logic.`;

// ══ UTILS ══
function renderMarkdown(t){
  t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
  t=t.replace(/^### (.+)$/gm,'<div style="font-family:Cinzel,serif;font-size:12px;color:#D4A53E;margin:10px 0 5px;letter-spacing:1px;">$1</div>');
  t=t.replace(/^## (.+)$/gm,'<div style="font-family:\'Share Tech Mono\',monospace;font-size:10px;color:rgba(212,165,62,0.7);margin:10px 0 5px;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid rgba(212,165,62,0.15);padding-bottom:3px;">$1</div>');
  t=t.replace(/^# (.+)$/gm,'<div style="font-family:Cinzel,serif;font-size:14px;font-weight:700;color:#fff;margin:8px 0 6px;letter-spacing:2px;">$1</div>');
  t=t.replace(/^- (.+)$/gm,'<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:#D4A53E;flex-shrink:0;">—</span><span>$1</span></div>');
  t=t.replace(/^(\d+)\. (.+)$/gm,'<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:#D4A53E;font-family:Cinzel,serif;font-size:11px;flex-shrink:0;">$1.</span><span>$2</span></div>');
  t=t.replace(/^---+$/gm,'<hr style="border:none;border-top:1px solid rgba(212,165,62,0.15);margin:10px 0;">');
  t=t.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');return t;
}
function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escA(s){return String(s).replace(/'/g,"\\'");}
function switchPanel(n,b){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));const p=document.getElementById('panel-'+n);if(p)p.classList.add('active');if(b)b.classList.add('active');}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px';}
function quickPrompt(t){document.getElementById('chatInput').value=t;sendMessage();}
function sendDirect(t){document.getElementById('chatInput').value=t;sendMessage();}
function handleKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}

// ══ API KEY + CHAT ══
let NEXAKEY="";
function showKeyModal(){document.getElementById('keyModal').style.display='flex';const stored=null;const hint=document.getElementById('storedKeyHint');if(stored&&hint){hint.style.display='block';hint.textContent='Saved key: '+stored.slice(0,12)+'...';}}
function clearStoredKey(){NEXAKEY='';const hint=document.getElementById('storedKeyHint');if(hint)hint.style.display='none';document.getElementById('apiKeyInput').value='';addMessage('nexa','API key cleared. Enter a new key to continue.');}
function saveApiKey(){const v=document.getElementById('apiKeyInput').value.trim();if(!v.startsWith('sk-')){document.getElementById('keyError').style.display='block';return;}NEXAKEY=v;document.getElementById('keyModal').style.display='none';addMessage('nexa','API key accepted. System fully operational. Pulling live data from Nexa Finance now.');syncFinanceData();}
let messages=[];
async function sendMessage(){
  if(!NEXAKEY){showKeyModal();return;}
  const inp=document.getElementById('chatInput'),text=inp.value.trim();if(!text)return;inp.value='';inp.style.height='auto';
  addMessage('user',text);messages.push({role:'user',content:text});const t=showTyping();
  try{
    const gc=northStar.goal?`\n\nNorth Star: "${northStar.goal}" (target: ${northStar.date||'none'}). Streak: ${streak.count} days.`:'';
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':NEXAKEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,system:NEXA_PERSONA+liveFinanceContext+gc,messages})});
    const d=await r.json();if(!r.ok){t.remove();addMessage('nexa','⚠ API Error: '+(d.error?.message||r.status));return;}
    const reply=d.content?.[0]?.text||'Error.';t.remove();addMessage('nexa',reply);messages.push({role:'assistant',content:reply});if(messages.length>20)messages=messages.slice(-20);
    speak(reply,'voiceOrb');
  }catch(e){t.remove();addMessage('nexa','⚠ '+(e.message||'unknown'));}
}
function addMessage(r,t){const c=document.getElementById('chatMessages'),m=document.createElement('div');m.className=`msg ${r}`;m.innerHTML=`<div class="msg-label">${r==='nexa'?'Nexa OS':'You'}</div><div class="msg-bubble">${renderMarkdown(t)}</div>`;c.appendChild(m);c.scrollTop=c.scrollHeight;}
function showTyping(){const c=document.getElementById('chatMessages'),w=document.createElement('div');w.className='msg nexa';w.innerHTML=`<div class="msg-label">Nexa OS</div><div class="typing"><span></span><span></span><span></span></div>`;c.appendChild(w);c.scrollTop=c.scrollHeight;return w;}

// ══ PLAN WITH NEXA ══
let planMessages=[];
let pendingPlan=null;

const PLAN_PERSONA=`You are NEXA — Nexa OS goal architect. Your job is to have a focused conversation that extracts someone's massive goal and helps them break it down into milestones and daily actions.

Be conversational and sharp. Ask one or two questions at a time. Pull out:
- The North Star (the one massive goal + target date)
- 3-6 milestones (concrete steps toward it)
- For each milestone: 2-4 daily actions (small repeatable things)

Once you have enough to build a real plan, generate it. Do not wait for perfection — a good plan now beats a perfect plan never.

When you have enough information, output EXACTLY this JSON block (no markdown fences, no extra text around it — just the raw JSON starting with a line that says PLAN_JSON:):

PLAN_JSON:
{"goal":"...","targetDate":"YYYY-MM-DD or empty","milestones":[{"name":"...","actions":["...","...","..."]}]}

Before generating the JSON, briefly summarize the plan in one sentence and say you're ready to lock it in.`;

function openPlan(){
  if(!NEXAKEY){showKeyModal();return;}
  planMessages=[];pendingPlan=null;
  document.getElementById('planPreview').style.display='none';
  document.getElementById('planMessages').innerHTML='';
  document.getElementById('planOverlay').classList.add('open');
  // Kick off with NEXA's opener
  addPlanMsg('nexa',"Goal Architect mode active.\n\nTell me what you're building toward. Don't filter it — just say it. What's the life you're trying to get to?\n\nI'll help you turn it into a real plan with milestones and daily actions.");
}

function closePlan(){document.getElementById('planOverlay').classList.remove('open');}

function handlePlanKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendPlanMessage();}}

async function sendPlanMessage(){
  if(!NEXAKEY){showKeyModal();return;}
  const inp=document.getElementById('planInput'),text=inp.value.trim();
  if(!text)return;
  inp.value='';inp.style.height='auto';
  addPlanMsg('user',text);
  planMessages.push({role:'user',content:text});
  const t=showPlanTyping();
  try{
    const sys=PLAN_PERSONA+(liveFinanceContext?'\n\nContext about their finances:'+liveFinanceContext:'');
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':NEXAKEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1200,system:sys,messages:planMessages})});
    const d=await r.json();
    if(!r.ok){t.remove();addPlanMsg('nexa','⚠ Error: '+(d.error?.message||r.status));return;}
    const reply=d.content?.[0]?.text||'Error.';
    t.remove();
    // Check for PLAN_JSON
    if(reply.includes('PLAN_JSON:')){
      const parts=reply.split('PLAN_JSON:');
      const before=parts[0].trim();
      if(before)addPlanMsg('nexa',before);
      try{
        const json=parts[1].trim();
        pendingPlan=JSON.parse(json);
        showPlanPreview(pendingPlan);
      }catch(e){addPlanMsg('nexa',reply);}
    } else {
      addPlanMsg('nexa',reply);
    }
    planMessages.push({role:'assistant',content:reply});
    if(planMessages.length>30)planMessages=planMessages.slice(-30);
  }catch(e){t.remove();addPlanMsg('nexa','⚠ '+e.message);}
}

function addPlanMsg(role,text){
  const c=document.getElementById('planMessages'),m=document.createElement('div');
  m.className='msg '+role;
  m.innerHTML=`<div class="msg-label">${role==='nexa'?'NEXA':'You'}</div><div class="msg-bubble">${renderMarkdown(text)}</div>`;
  c.appendChild(m);c.scrollTop=c.scrollHeight;
}

function showPlanTyping(){
  const c=document.getElementById('planMessages'),w=document.createElement('div');
  w.className='msg nexa';
  w.innerHTML='<div class="msg-label">NEXA</div><div class="typing"><span></span><span></span><span></span></div>';
  c.appendChild(w);c.scrollTop=c.scrollHeight;return w;
}

function showPlanPreview(plan){
  document.getElementById('planPreviewGoal').textContent=plan.goal+(plan.targetDate?' — Target: '+new Date(plan.targetDate+'T00:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}):'');
  const msEl=document.getElementById('planPreviewMilestones');
  msEl.innerHTML=plan.milestones.map((ms,i)=>`
    <div style="margin-bottom:8px;">
      <div class="plan-preview-ms" style="color:var(--text-bright);font-size:11px;margin-bottom:3px;">${i+1}. ${escH(ms.name)}</div>
      ${ms.actions.map(a=>`<div class="plan-preview-ms" style="margin-left:12px;">· ${escH(a)}</div>`).join('')}
    </div>`).join('');
  document.getElementById('planPreview').style.display='block';
  document.getElementById('planMessages').scrollTop=document.getElementById('planMessages').scrollHeight;
}

function savePlanToSystem(){
  if(!pendingPlan)return;
  // Set North Star
  northStar.goal=pendingPlan.goal;
  northStar.date=pendingPlan.targetDate||'';
  save('northStar',northStar);
  // Replace milestones (ask user first if they have existing ones)
  const existing=milestones.length>0;
  if(existing&&!confirm('You have existing milestones. Replace them with the new plan?'))return;
  milestones=pendingPlan.milestones.map(ms=>({id:Date.now()+Math.random(),name:ms.name,actions:ms.actions.map(a=>({id:Date.now()+Math.random(),text:a,done:false}))}));
  save('milestones',milestones);
  // Close and refresh
  closePlan();
  renderNorthStar();
  renderMilestones();
  renderTodayAction();
  // Switch to status to see it
  switchPanel('goals',document.querySelectorAll('.nav-btn')[1]);
  addMessage('nexa','✓ Plan locked in. Your North Star and milestones are set. Go to the **Status** tab to see your full roadmap — and pick your first daily action.');
}

function discardPlan(){
  pendingPlan=null;
  document.getElementById('planPreview').style.display='none';
  addPlanMsg('nexa','No problem. Keep going — tell me more and we\'ll refine it.');
}

window.addEventListener('load',()=>{updateVoiceUI();renderNorthStar();renderMilestones();renderTodayAction();showKeyModal();});
</script>
</body>
</html>

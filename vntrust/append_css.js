const fs = require('fs');
const file = 'src/app/globals.css';
const existing = fs.readFileSync(file, 'utf8');
const additions = `
/* MOBILE APP UI COMPONENTS */

.mobile-page { position: relative; z-index: 1; min-height: calc(100vh - 64px); padding-bottom: 88px; }

.mobile-card {
  background: linear-gradient(180deg, rgba(246,241,232,0.05) 0%, rgba(246,241,232,0.02) 100%);
  border: 1px solid rgba(200, 165, 87, 0.15);
  border-radius: 16px;
  overflow: hidden;
}

.mobile-hero-card {
  background: linear-gradient(135deg, #0B1623 0%, #142235 60%, #1E3148 100%);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  color: #F6F1E8;
}
.mobile-hero-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(200,165,87,0.18) 0%, transparent 60%);
  pointer-events: none;
}

.mobile-badge-verified {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px 4px 7px;
  background: rgba(74,124,92,0.2); border: 1px solid rgba(111,181,133,0.35);
  border-radius: 100px; font-size: 10px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; color: #94CFA8;
}
.mobile-badge-fake {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: rgba(159,45,62,0.2); border: 1px solid rgba(209,76,95,0.35);
  border-radius: 100px; font-size: 10px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; color: #D14C5F;
}
.mobile-badge-pending {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: rgba(200,137,58,0.15); border: 1px solid rgba(200,137,58,0.3);
  border-radius: 100px; font-size: 10px; font-weight: 600; color: #C8893A;
}

.gold-pulse-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #C8A557; box-shadow: 0 0 0 4px rgba(200,165,87,0.2);
  animation: gold-pulse 2.4s ease-in-out infinite;
}
@keyframes gold-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(200,165,87,0.2); }
  50% { box-shadow: 0 0 0 8px rgba(200,165,87,0); }
}

.verified-pulse-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #6FB585; box-shadow: 0 0 0 3px rgba(111,181,133,0.3);
  animation: verified-pulse 2s ease-in-out infinite;
}
@keyframes verified-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(111,181,133,0.3); }
  50% { box-shadow: 0 0 0 6px rgba(111,181,133,0); }
}

.mobile-btn-gold {
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #E4D2A1, #C8A557);
  color: #0B1623; border: none; border-radius: 14px;
  font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: opacity 0.2s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.mobile-btn-gold:active { transform: scale(0.98); opacity: 0.9; }

.font-display { font-family: 'Fraunces', Georgia, serif; }
.font-sans-mobile { font-family: 'Outfit', 'Inter', sans-serif; }
.font-mono-mobile { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum'; }

@keyframes scanLine {
  0%, 100% { top: 8px; }
  50% { top: calc(100% - 10px); }
}
.scan-line-anim { animation: scanLine 2.4s ease-in-out infinite; }

@keyframes blink-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.blink-dot { animation: blink-dot 1.2s ease-in-out infinite; }

.tap-feedback { -webkit-tap-highlight-color: transparent; transition: transform 0.1s, opacity 0.1s; }
.tap-feedback:active { transform: scale(0.97); opacity: 0.85; }

.gold-separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200,165,87,0.3), transparent);
  margin: 16px 0;
}

.mobile-input {
  width: 100%; padding: 12px 14px;
  background: rgba(246,241,232,0.06); border: 1px solid rgba(200,165,87,0.2);
  border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 14px;
  color: #F6F1E8; outline: none; transition: border-color 0.2s;
}
.mobile-input::placeholder { color: rgba(246,241,232,0.35); }
.mobile-input:focus { border-color: #C8A557; }

.mobile-chip {
  padding: 6px 12px; border: 1px solid rgba(200,165,87,0.25); border-radius: 100px;
  font-size: 11px; font-weight: 500; color: rgba(246,241,232,0.55);
  cursor: pointer; transition: all 0.2s; background: transparent;
  -webkit-tap-highlight-color: transparent;
}
.mobile-chip.active {
  background: rgba(200,165,87,0.15); border-color: #C8A557; color: #C8A557;
}

.mobile-role-card {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  border: 1px solid rgba(200,165,87,0.15); border-radius: 14px;
  background: linear-gradient(180deg, rgba(246,241,232,0.03), rgba(246,241,232,0.01));
  cursor: pointer; transition: border-color 0.25s, transform 0.25s;
  -webkit-tap-highlight-color: transparent; text-decoration: none; color: #F6F1E8;
}
.mobile-role-card:active { border-color: #C8A557; transform: translateX(2px); }
`;
fs.writeFileSync(file, existing + additions, 'utf8');
console.log('Done! CSS length:', existing.length + additions.length);

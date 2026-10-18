// Janelas HTML simples por cima do jogo, usadas pelos serviços FALSOS de anúncios e compras
// (modo de testes). Não aparecem na versão real.
const STYLE_ID = 'cd-overlay-style';

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
  .cd-ov{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;
    background:rgba(7,4,26,.82);font-family:'Outfit',system-ui,sans-serif;color:#F5F2FF}
  .cd-ov .box{background:linear-gradient(#30275C,#1D1740);border:1px solid rgba(255,255,255,.16);border-radius:24px;
    padding:22px 20px;width:min(86vw,360px);text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.5);position:relative}
  .cd-ov h2{font-weight:700;margin:4px 0 8px;font-size:24px}
  .cd-ov p{margin:6px 0;font-size:15px}
  .cd-ov .bar{height:12px;background:rgba(7,4,26,.6);border-radius:6px;overflow:hidden;margin:14px 0}
  .cd-ov .bar i{display:block;height:100%;width:0;background:#22C98A;transition:width .2s linear}
  .cd-ov button{font-family:inherit;font-weight:700;font-size:18px;border:0;border-radius:999px;
    padding:10px 20px;margin:6px;color:#fff;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.3)}
  .cd-ov .ok{background:#22C98A}.cd-ov .no{background:#FF4D6D}
  .cd-ov .x{position:absolute;top:8px;right:10px;width:36px;height:36px;padding:0;margin:0;background:#463C82;border-radius:18px;font-size:18px}
  .cd-ov .tag{display:inline-block;background:#4F7BFF;color:#fff;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:800}`;
  document.head.appendChild(st);
}

export function overlay(html: string): HTMLDivElement {
  ensureStyle();
  const el = document.createElement('div');
  el.className = 'cd-ov';
  el.innerHTML = `<div class="box">${html}</div>`;
  document.body.appendChild(el);
  return el;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

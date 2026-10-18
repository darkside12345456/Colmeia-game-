// Janelas HTML simples por cima do jogo, usadas pelos serviços FALSOS de anúncios e compras
// (modo de testes). Não aparecem na versão real.
const STYLE_ID = 'cd-overlay-style';

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
  .cd-ov{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;
    background:rgba(20,14,4,.82);font-family:'Nunito',sans-serif;color:#2E2412}
  .cd-ov .box{background:#FBF6EA;border-radius:22px;padding:22px 20px;width:min(86vw,360px);text-align:center;
    box-shadow:0 10px 0 #d9cba4,0 18px 40px rgba(0,0,0,.4);position:relative}
  .cd-ov h2{font-family:'Baloo 2',sans-serif;font-weight:800;margin:4px 0 8px;font-size:24px}
  .cd-ov p{margin:6px 0;font-size:15px}
  .cd-ov .bar{height:12px;background:#F2EAD3;border-radius:6px;overflow:hidden;margin:14px 0}
  .cd-ov .bar i{display:block;height:100%;width:0;background:#54C143;transition:width .2s linear}
  .cd-ov button{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:18px;border:0;border-radius:14px;
    padding:10px 18px;margin:6px;color:#fff;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.25)}
  .cd-ov .ok{background:#54C143}.cd-ov .no{background:#E8384F}
  .cd-ov .x{position:absolute;top:8px;right:10px;width:36px;height:36px;padding:0;margin:0;background:#E8384F;border-radius:18px;font-size:18px}
  .cd-ov .tag{display:inline-block;background:#0293F2;color:#fff;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:800}`;
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

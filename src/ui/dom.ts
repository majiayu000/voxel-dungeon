/** 按 id 取 DOM 元素，缺失即抛错（快速暴露模板与代码不一致）。 */
export function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`缺少 DOM 元素: #${id}`);
  return el;
}

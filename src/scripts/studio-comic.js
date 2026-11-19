const desk = document.querySelector('.paper-desk');
const book = desk.querySelector('.book');
const left = book.querySelector('.left');
const right = book.querySelector('.right');
const leaf = book.querySelector('.leaf');
const [front, back] = leaf.children;
const prev = desk.querySelector('[data-prev]');
const next = desk.querySelector('[data-next]');
const status = desk.querySelector('.paper-status');
const scenes = ['画桌旁，黑猫抬头望向窗户。','猫走到窗边，把爪子贴在玻璃上。','雾气散开，远处的列车穿过夜色。','画者把猫和窗外的塔画进了手稿。'];
let spread = 0;
let turning = false;
function page(index) {
  if (index > 0 && index <= scenes.length) {
    const image = new Image();
    image.src = '/studio/comic/' + index + '.webp';
    image.alt = '第 ' + index + ' 页。' + scenes[index - 1];
    image.draggable = false;
    return image;
  }
  const title = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = index === 0 ? '夜色落在猫爪上' : '完';
  const credit = document.createElement('small');
  credit.textContent = 'XLEIA STUDIO';
  title.append(name, credit);
  return title;
}
function paint() {
  left.replaceChildren(page(spread * 2));
  right.replaceChildren(page(spread * 2 + 1));
  prev.disabled = spread === 0;
  next.disabled = spread === 2;
  status.textContent = ['扉页 · 1','2 · 3','4 · 终页'][spread];
}
async function turn(direction) {
  const target = spread + direction;
  if (turning || target < 0 || target > 2) return;
  turning = true;
  const forward = direction > 0;
  const before = spread * 2, after = target * 2;
  front.replaceChildren(page(forward ? before + 1 : after + 1));
  back.replaceChildren(page(forward ? after : before));
  (forward ? right : left).replaceChildren(page(forward ? after + 1 : after));
  leaf.hidden = false;
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
    const angles = forward ? [0,-180] : [-180,0];
    const animation = leaf.animate(angles.map(angle => ({transform:'rotateY(' + angle + 'deg)'})), {duration:610,easing:'ease-in-out',fill:'both'});
    try { await animation.finished; } catch { /* Settle on the selected spread. */ }
    animation.cancel();
  }
  spread = target;
  paint();
  leaf.hidden = true;
  turning = false;
}
prev.addEventListener('click', () => turn(-1));
next.addEventListener('click', () => turn(1));
let start;
book.addEventListener('pointerdown', event => {
  if (event.button || !event.isPrimary) return;
  start = event.clientX;
  book.setPointerCapture(event.pointerId);
});
book.addEventListener('pointerup', event => {
  if (start === undefined || !event.isPrimary) return;
  const delta = event.clientX - start;
  const rect = book.getBoundingClientRect();
  start = undefined;
  turn(Math.abs(delta) > 28 ? -Math.sign(delta) : event.clientX > rect.left + rect.width / 2 ? 1 : -1);
});
book.addEventListener('pointercancel', () => { start = undefined; });
document.addEventListener('keydown', event => {
  if (desk.hidden || desk.closest('.detail').hidden || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  turn(event.key === 'ArrowRight' ? 1 : -1);
});
paint();

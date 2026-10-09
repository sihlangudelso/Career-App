/* ============================================================
   DOWNLOAD THE REPORT AS A PDF

   "Download PDF" builds the PDF in the learner's own browser and saves it as a file -- no print
   window, no print settings to get wrong, and always exactly the four A4 pages of report_pdf.js
   (a browser's print engine decides how pages break and can add blank ones; this does not).

   How: the same A4 pages the print view uses are laid out off-screen at 210mm wide, fitted
   (a4FitAll), and each page is drawn to an image (html2canvas) that becomes one A4 page of a PDF
   (jsPDF). Both libraries are loaded from a CDN the first time someone presses the button -- never
   with the page -- pinned to an exact version and checked against a fixed hash (SRI), so a changed
   file would simply not run. Nothing the learner sees or types leaves the browser.

   The pages are images, so the text in the downloaded PDF cannot be selected (an invisible text
   layer sits on top of each page so that it can be searched and read by assistive technology).
   If the libraries cannot be loaded (offline, or blocked by a school network) or anything goes
   wrong, the print window opens instead ("Save as PDF" there works in Chrome, Edge and Firefox)
   -- except in Safari and on iPhones/iPads, where printing the A4 pages gives extra blank
   sheets (WebKit ignores @page), so there the learner is asked to try again.

   Test hook: rdBuildPDF(l, R) returns the finished jsPDF document without saving it.
   ============================================================ */

const RD_CONFIG = {
  // 2.5 = 240 dpi on A4: crisp text when zoomed or printed, about 1.5 MB for four pages.
  scale: 2.5,
  jpegQuality: 0.92,
  loadTimeoutMs: 25000,
};
const RD_LIBS = [
  { name: 'html2canvas', global: 'html2canvas', src: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    integrity: 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H' },
  { name: 'jsPDF', global: 'jspdf', src: 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
    integrity: 'sha384-qovJwSBbRDPP5cEjCp8S0UP66wrvnjaa60XMOGzTNanrThcrGfXfnZkvgY8N1KT3' },
];
let RD_BUSY = false;

// Adds a library's <script> (once), resolving when its global exists.
function rdLoadLib(lib){
  if(window[lib.global]) return Promise.resolve();
  if(lib.loading) return lib.loading;
  lib.loading = new Promise(function(resolve, reject){
    const el = document.createElement('script');
    el.src = lib.src; el.integrity = lib.integrity; el.crossOrigin = 'anonymous'; el.async = true;
    const timer = setTimeout(function(){ el.remove(); reject(new Error(lib.name + ' took too long to load')); }, RD_CONFIG.loadTimeoutMs);
    el.onload = function(){ clearTimeout(timer); window[lib.global] ? resolve() : reject(new Error(lib.name + ' did not start')); };
    el.onerror = function(){ clearTimeout(timer); el.remove(); reject(new Error(lib.name + ' could not be loaded')); };
    document.head.appendChild(el);
  }).catch(function(err){ lib.loading = null; throw err; });
  return lib.loading;
}

// The A4 pages, laid out off-screen at their real size (the fit pass and the drawing both need layout).
function rdHost(l, R){
  const host = document.createElement('div');
  host.id = 'rdHost'; host.className = 'rd-host';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = reportA4HTML(l, R);
  document.body.appendChild(host);
  return host;
}
// Every page starts with a coloured header band: if the pixels there are white, nothing was drawn (a browser that
// cannot do this would otherwise give a blank page without saying so) and the print window is used instead.
function rdLooksDrawn(canvas){
  try {
    const px = canvas.getContext('2d').getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.015), 1, 1).data;
    return !(px[3] === 0 || (px[0] > 245 && px[1] > 245 && px[2] > 245));
  } catch(e){ return true; }   // cannot tell: trust it
}
// A short pause so the button's label can repaint. (A timer, not requestAnimationFrame: the browser stops animation
// frames in a tab the learner has switched away from, and the download would wait for them to come back.)
function rdYield(){ return new Promise(function(resolve){ setTimeout(resolve, 0); }); }
// Fonts and the logo images must be ready before a page is drawn, or the picture would use fallbacks.
function rdReady(host){
  const imgs = Array.prototype.slice.call(host.querySelectorAll('img')).map(function(img){
    return img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode().catch(function(){}) : Promise.resolve());
  });
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  return Promise.all(imgs.concat([fonts])).then(rdYield);
}

// The words of a page with where they are, line by line, in millimetres from the page's top-left.
// They are drawn invisibly over the page picture so the PDF can be searched, selected and read aloud.
function rdTextLines(page){
  const box = page.getBoundingClientRect(), mm = 210 / box.width;
  const lines = [];
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, null);
  let node;
  while((node = walker.nextNode())){
    const text = node.nodeValue;
    if(!text || !text.trim()) continue;
    const el = node.parentElement;
    if(!el || el.closest('svg')) continue;
    const cs = getComputedStyle(el);
    if(cs.visibility === 'hidden' || cs.display === 'none') continue;
    const range = document.createRange();
    const re = /\S+/g;
    let m, cur = null;
    while((m = re.exec(text))){
      range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const r = range.getClientRects()[0];
      if(!r || !r.width || !r.height) continue;
      // clipped away (overflow hidden, line clamp): not on the picture, so not in the text either
      if(r.bottom > box.bottom + 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.left < box.left - 1) continue;
      const word = { t: m[0], x: (r.left - box.left) * mm, y: (r.top - box.top) * mm, w: r.width * mm, h: r.height * mm };
      // the next word on the same line (within 3 mm of the last one) joins it
      if(cur && Math.abs(cur.y - word.y) < 0.6 && word.x - (cur.x + cur.w) < 3 && word.x >= cur.x){ cur.t += ' ' + word.t; cur.w = word.x + word.w - cur.x; }
      else { cur = word; lines.push(cur); }
    }
  }
  return lines;
}

// Builds the finished PDF (a jsPDF document), one A4 page per report page. `progress(i, n)` is told which page is being drawn.
async function rdBuildPDF(l, R, progress){
  await Promise.all(RD_LIBS.map(rdLoadLib));
  const host = rdHost(l, R);
  try {
    await rdReady(host);
    a4FitAll(host.querySelector('.a4-doc'));
    await rdYield();
    const pages = Array.prototype.slice.call(host.querySelectorAll('.a4-page'));
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    pdf.setProperties({ title: R.meta.title + (R.meta.name && R.meta.name !== 'You' ? ' — ' + R.meta.name : ''), subject: R.meta.title, author: 'iroli', creator: 'iroli Career Pathway' });
    for(let i = 0; i < pages.length; i++){
      if(progress) progress(i, pages.length);
      await rdYield();   // let the button's label repaint before the (busy) drawing
      const page = pages[i];
      const canvas = await window.html2canvas(page, {
        scale: RD_CONFIG.scale, backgroundColor: '#ffffff', logging: false, useCORS: true,
        width: page.offsetWidth, height: page.offsetHeight, windowWidth: Math.max(window.innerWidth, 1000), windowHeight: Math.max(window.innerHeight, 1200),
        scrollX: 0, scrollY: 0,
        // in the copy html2canvas draws from, the pages sit in view (the real ones are off to the left)
        onclone: function(doc){ const h = doc.getElementById('rdHost'); if(h){ h.style.left = '0px'; h.style.top = '0px'; } },
      });
      if(!rdLooksDrawn(canvas)) throw new Error('page ' + (i + 1) + ' came out blank');
      if(i) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', RD_CONFIG.jpegQuality), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      canvas.width = canvas.height = 0;   // give the memory back before the next page
      // the invisible text layer (render mode 3 = neither filled nor stroked)
      try {
        pdf.setFont('helvetica', 'normal');
        rdTextLines(page).forEach(function(w){
          // the standard font is sized so that the text is as wide as the real font made it: a selection then lines up with the words
          const base = Math.max(4, w.h * 72 / 25.4 * 0.72);
          pdf.setFontSize(base);
          const natural = pdf.getTextWidth(w.t);
          pdf.setFontSize(natural > 0 ? Math.max(base * 0.6, Math.min(base * 1.5, base * w.w / natural)) : base);
          pdf.text(w.t, w.x, w.y + w.h * 0.78, { renderingMode: 'invisible' });
        });
      } catch(e){ /* the picture is what matters; a page without a text layer is still a complete page */ }
    }
    return pdf;
  } finally {
    host.remove();
  }
}

// Safari, and every browser on an iPhone or iPad, print through WebKit, which ignores the report's A4 page rule:
// the pages then spill onto extra, mostly blank sheets. Chrome, Edge and Firefox honour it, so for them the print
// window is a good second choice; for the others a retry is a better one.
function rdPrintHonoursA4(){
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Android|Firefox/.test(ua);
  return !(ios || safari);
}

function rdFileName(R){
  const clean = function(s){ return String(s || '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'); };
  const who = R.meta.name && R.meta.name !== 'You' ? '-' + clean(R.meta.name) : '';
  return 'Iroli-' + clean(R.meta.title) + who + '.pdf';
}

// The "Download PDF" button.
async function downloadReportPDF(btn){
  if(RD_BUSY) return;
  RD_BUSY = true;
  const label = btn ? btn.innerHTML : null;
  const busy = function(text){ if(btn){ btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.innerHTML = '<span class="rd-spin" aria-hidden="true"></span> ' + esc(text); } };
  try {
    busy('Preparing your PDF…');
    const l = ensureLearnerObj(), R = buildLearnerReport(l);
    const pdf = await rdBuildPDF(l, R, function(i, n){ busy(n > 1 ? 'Page ' + (i + 1) + ' of ' + n + '…' : 'Preparing your PDF…'); });
    pdf.save(rdFileName(R));
    toast('Your report was downloaded.');
  } catch(err){
    console.error('[iroli] the PDF could not be built:', err);
    if(rdPrintHonoursA4()){
      toast('The PDF could not be prepared here, so the print window is opening — choose “Save as PDF” there.');
      setTimeout(function(){ window.print(); }, 400);
    } else {
      toast('The PDF could not be prepared. Check your internet connection and try again.');
    }
  } finally {
    RD_BUSY = false;
    if(btn){ btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = label; }
  }
}

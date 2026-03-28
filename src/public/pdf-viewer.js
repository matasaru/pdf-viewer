// noinspection JSUnresolvedReference
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf/pdf.worker.mjs';

const sidebar = document.getElementById('sidebar');
const viewer = document.getElementById('viewer');
const zoomLevel = document.getElementById('zoomLevel');
const overlay = document.getElementById('loadingOverlay');
const loadMsg = document.getElementById('loadingMsg');

let pdfDoc = null;
let scale = 1.4;
let currentPage = 1;

function setLoading(msg) {
    loadMsg.textContent = msg;
}

async function renderPage(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const vp = page.getViewport({scale});
    const annots = await page.getAnnotations();
    const links = annots.filter(a => a.subtype === 'Link');

    const wrap = document.createElement('div');
    wrap.className = 'page-wrap';
    wrap.dataset.page = pageNum;
    wrap.style.width = vp.width + 'px';
    wrap.style.height = vp.height + 'px';

    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.width = vp.width + 'px';
    canvas.style.height = vp.height + 'px';
    wrap.appendChild(canvas);

    await page.render({canvasContext: canvas.getContext('2d'), viewport: vp}).promise;

    // getting down to the business: highlighting links 
    links.forEach((link, index) => {
        if (!link.rect) {
            return;
        }

        // these are all http links, not PDF internal 
        let href = link.url;

        const lw = document.createElement('div');
        lw.className = 'link-wrap';
        lw.textContent = href;
        lw.addEventListener('click', () => {
            viewer.querySelector(`[data-link='${index}']`).scrollIntoView({behavior: 'smooth', block: 'center'});
        });
        sidebar.appendChild(lw);

        
        const [x1, y1, x2, y2] = link.rect;
        const cvpPt = vp.convertToViewportRectangle([x1, y1, x2, y2]);
        const left = Math.min(cvpPt[0], cvpPt[2]);
        const top = Math.min(cvpPt[1], cvpPt[3]);
        const width = Math.abs(cvpPt[2] - cvpPt[0]);
        const height = Math.abs(cvpPt[3] - cvpPt[1]);

        const hl = document.createElement('div');
        hl.className = 'link-overlay';
        hl.dataset.link = index;
        hl.style.left = left + 'px';
        hl.style.top = top + 'px';
        hl.style.width = width + 'px';
        hl.style.height = height + 'px';

        if (href) {
            hl.title = href;
            hl.addEventListener('click', () => {
                if (href.startsWith('http://') || href.startsWith('https://')) {
                    window.open(href, '_blank', 'noopener');
                }
            });
        }

        wrap.appendChild(hl);
    });
    viewer.appendChild(wrap);

    return links.length;
}

async function loadPDF() {
    setLoading('Fetching PDF…');
    const url = `/assets/Designering.pdf`;
    const pdf = await pdfjsLib.getDocument(url).promise;
    pdfDoc = pdf;

    for (let p = 1; p <= pdf.numPages; p++) {
        setLoading(`Rendering page ${p} of ${pdf.numPages}…`);
        await renderPage(p);
    }

    if (pdf.numPages === 0) {
        viewer.querySelector('#emptyState').style.display = 'flex';
    }

    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 400);
}

document.getElementById('zoomIn').addEventListener('click', () => {
    scale = Math.min(scale + 0.2, 3.0);
    zoomLevel.textContent = Math.round(scale / 1.4 * 100) + '%';
    rebuildViewer();
});
document.getElementById('zoomOut').addEventListener('click', () => {
    scale = Math.max(scale - 0.2, 0.4);
    zoomLevel.textContent = Math.round(scale / 1.4 * 100) + '%';
    rebuildViewer();
});

async function rebuildViewer() {
    const savedPage = currentPage;
    viewer.innerHTML = '';
    sidebar.innerHTML = '';
    for (let p = 1; p <= pdfDoc.numPages; p++) {
        await renderPage(p);
    }
    viewer.querySelector(`[data-page='${savedPage}']`).scrollIntoView({block: 'start'});
}

loadPDF().catch(err => {
    loadMsg.textContent = 'Error loading PDF: ' + err.message;
    document.querySelector('.spinner').style.display = 'none';
});
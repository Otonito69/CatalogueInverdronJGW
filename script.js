// 1. CONFIGURACIÓN INICIAL
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const pdfPath = 'CatalogoInverdronOP.pdf';
const container = document.getElementById('book-container');
const flipSound = document.getElementById('flipSound');
const currentPageBox = document.getElementById('currentPage');

let pageFlip = null;
let pdfTextContent = [];
let isManualAction = false;

// 2. DATOS DEL ÍNDICE
const tableOfContents = [
    {
        title: "Herramientas Dieléctricas", page: 4,
        items: [
            { title: "Pértigas", page: 4 }, { title: "EPP Dieléctrico", page: 6 },
            { title: "Covertores de línea", page: 8 }, { title: "Dieléctrico", page: 8 },
            { title: "Accesorios", page: 10 }, { title: "Jumpers y Aterrizaje", page: 10 },
            { title: "Equipo para Trabajos en Red Eléctrica", page: 12 }
        ]
    },
    {
        title: "Equipos de Detección y Medición", page: 14,
        items: [{ title: "Equipos de Detección", page: 14 }, { title: "Equipos de Medición", page: 16 }]
    },
    {
        title: "Klein Tools", page: 18,
        items: [{ title: "Productos Kleintools", page: 18 }]
    },
    {
        title: "EPP - Alturas y Protección", page: 22,
        items: [
            { title: "EPP Visuales/Auditivos", page: 24 }, { title: "Escaleras Dieléctricas", page: 26 },
            { title: "EPP de Alturas", page: 28 }, { title: "EPP Corporal", page: 32 }
        ]
    },
    {
        title: "Herramientas Generales", page: 34,
        items: [
            { title: "Dieléctricas", page: 34 }, { title: "Eléctricas", page: 36 },
            { title: "Manuales", page: 38 }
        ]
    }
];

// 3. FUNCIONES DE APOYO
function hideLoader() {
    const loader = document.getElementById('loadingOverlay');
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 800);
}

function calculateBookDimensions() {
    const wrapper = document.getElementById('book-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();
    const aspectRatio = 760 / 552;
    const maxWidth = wrapperRect.width * 0.9;
    const maxHeight = wrapperRect.height * 0.9;

    let w, h;
    if (maxWidth * aspectRatio <= maxHeight) {
        w = maxWidth; h = maxWidth * aspectRatio;
    } else {
        h = maxHeight; w = maxHeight / aspectRatio;
    }
    return { width: Math.floor(w), height: Math.floor(h) };
}

function playFlipSound() {
    flipSound.pause(); flipSound.currentTime = 0; flipSound.volume = 0.6;
    flipSound.play().catch(() => { });
}

function goToPage(num) {
    isManualAction = true;
    playFlipSound();
    pageFlip.turnToPage(num - 1);
    document.getElementById('indexPanel').classList.remove('active');
}

// 4. MOTOR PRINCIPAL
async function startApp() {
    try {
        const pdfDoc = await pdfjsLib.getDocument(pdfPath).promise;
        const total = pdfDoc.numPages;
        document.getElementById('totalPagesText').innerText = total;

        const dims = calculateBookDimensions();

        // --- CAMBIO 1: Forzamos una escala de renderizado alta (4.0) ---
        // Esto ignora el tamaño de la pantalla y dibuja con calidad de imprenta.
        const renderScale = 1.6;
        const fragment = document.createDocumentFragment();

        for (let i = 1; i <= total; i++) {
            const page = await pdfDoc.getPage(i);
            const text = await page.getTextContent();
            pdfTextContent.push({ pageNum: i, text: text.items.map(s => s.str).join(' ') });

            // --- CAMBIO 2: Usamos la renderScale para el viewport ---
            const viewport = page.getViewport({ scale: renderScale });
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.setAttribute('data-density', (i === 1 || i === total) ? 'hard' : 'soft');

            const canvas = document.createElement('canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // --- CAMBIO 3: Ajustamos el tamaño VISUAL del canvas ---
            // Esto hace que la imagen gigante quepa en el librito sin desbordarse.
            canvas.style.width = "100%";
            canvas.style.height = "100%";

            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: viewport,
                intent: 'print' // Ayuda a que pdf.js priorice la nitidez del texto
            }).promise;

            pageDiv.appendChild(canvas);
            fragment.appendChild(pageDiv);
            document.getElementById('status').innerText = `Cargando: ${i}/${total}`;
        }

        container.appendChild(fragment);
        initFlipbook(dims);
        generateIndexUI();

        document.getElementById('status').style.display = 'none';
        document.getElementById('searchInput').disabled = false;
        setTimeout(hideLoader, 500);

    } catch (e) {
        console.error(e);
        hideLoader();
    }
}

function initFlipbook(dims) {
    container.style.width = dims.width + 'px';
    container.style.height = dims.height + 'px';

    pageFlip = new St.PageFlip(container, {
        width: dims.width, height: dims.height,
        size: "stretch", showCover: true, useMouseEvents: true,
        flippingTime: 800, maxShadowOpacity: 0.5
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    container.style.visibility = 'visible';

    pageFlip.on('flip', (e) => {
        currentPageBox.innerText = e.data + 1;
        if (!isManualAction) playFlipSound();
        isManualAction = false;
    });

    document.getElementById('prevBtn').onclick = () => { isManualAction = true; playFlipSound(); pageFlip.flipPrev(); };
    document.getElementById('nextBtn').onclick = () => { isManualAction = true; playFlipSound(); pageFlip.flipNext(); };

    setupSearch();
    setupControls();
}

function generateIndexUI() {
    const content = document.getElementById('indexContent');
    tableOfContents.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerHTML = `<div class="category-title"><span>${cat.title}</span><span class="category-arrow">▶</span></div>`;

        const subList = document.createElement('div');
        subList.className = 'subcategory-list';

        cat.items.forEach(item => {
            const si = document.createElement('div');
            si.className = 'subcategory-item';
            si.textContent = `${item.title} - Pág. ${item.page}`;
            si.onclick = () => goToPage(item.page);
            subList.appendChild(si);
        });

        const titleBtn = div.querySelector('.category-title');
        titleBtn.onclick = () => {
            subList.classList.toggle('expanded');
            titleBtn.classList.toggle('active');
            titleBtn.querySelector('.category-arrow').classList.toggle('rotated');
        };
        titleBtn.ondblclick = () => goToPage(cat.page);

        div.appendChild(subList);
        content.appendChild(div);
    });
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    const panel = document.getElementById('searchPanel');
    const list = document.getElementById('resultsList');

    input.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        if (val.length < 3) { panel.classList.remove('active'); return; }

        const results = pdfTextContent.filter(p => p.text.toLowerCase().includes(val));
        list.innerHTML = results.length ? '' : '<div>Sin resultados</div>';
        panel.classList.add('active');

        results.forEach(r => {
            const d = document.createElement('div');
            d.className = 'result-item';
            d.innerHTML = `<strong>Pág ${r.pageNum}</strong><br><small>${r.text.substring(0, 60)}...</small>`;
            d.onclick = () => { goToPage(r.pageNum); panel.classList.remove('active'); };
            list.appendChild(d);
        });
    };
}

function setupControls() {
    document.getElementById('indexBtn').onclick = () => document.getElementById('indexPanel').classList.toggle('active');
    document.getElementById('closeIndexBtn').onclick = () => document.getElementById('indexPanel').classList.remove('active');
    document.getElementById('zoomBtn').onclick = () => document.getElementById('zoomWrapper').classList.toggle('active');

    const zRange = document.getElementById('zoomRange');
    let px = 0, py = 0;

    zRange.oninput = () => container.style.transform = `translate(${px}px,${py}px) scale(${zRange.value})`;

    document.getElementById('dragBtn').onclick = function () {
        this.classList.toggle('active');
        container.classList.toggle('grabbing-mode');
        if (!this.classList.contains('active')) {
            px = 0; py = 0; zRange.value = 1;
            container.style.transform = 'translate(0,0) scale(1)';
        }
    };

    let dragging = false, sx, sy;
    const wrap = document.getElementById('book-wrapper');
    const start = (e) => {
        if (!container.classList.contains('grabbing-mode')) return;
        dragging = true;
        const p = e.touches ? e.touches[0] : e;
        sx = p.pageX - px; sy = p.pageY - py;
    };
    const move = (e) => {
        if (!dragging) return;
        const p = e.touches ? e.touches[0] : e;
        px = p.pageX - sx; py = p.pageY - sy;
        container.style.transform = `translate(${px}px,${py}px) scale(${zRange.value})`;
    };
    wrap.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    wrap.addEventListener('touchstart', start);
    window.addEventListener('touchmove', move);
    window.addEventListener('mouseup', () => dragging = false);
    window.addEventListener('touchend', () => dragging = false);

    document.getElementById('downloadBtn').onclick = () => {
        const a = document.createElement('a'); a.href = pdfPath; a.download = 'CatalogoInverdron.pdf'; a.click();
    };
}

startApp();

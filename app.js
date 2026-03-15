// 전역 상태 변수
let allItems = [];
let currentView = 'card';

document.addEventListener('DOMContentLoaded', () => {
    const itemsGrid = document.getElementById('items-grid');
    const tableBody = document.getElementById('table-body');
    const itemsTableWrapper = document.getElementById('items-table-wrapper');
    const totalCount = document.getElementById('total-count');
    const updateDate = document.getElementById('update-date');
    const searchInput = document.getElementById('search-input');
    const loader = document.getElementById('loader');
    const dateRangeSpan = document.getElementById('current-date-range');
    const filterBadge = document.getElementById('filter-info-badge');

    const btnCard = document.getElementById('view-card');
    const btnTable = document.getElementById('view-table');
    const btnExport = document.getElementById('btn-export');
    const btnCrawl = document.getElementById('btn-crawl');

    // CORS 프록시 설정 (Cloudflare Worker 대신 퍼블릭 프록시 사용)
    const PROXY_URL = 'https://corsproxy.io/?url='; 

    function getProxiedUrl(originalUrl) {
        if (!originalUrl || originalUrl.includes('poke-ball.png')) return originalUrl;
        return PROXY_URL + encodeURIComponent(originalUrl);
    }

    // 데이터 로드
    function loadData() {
        try {
            if (!window.lostItems) {
                throw new Error('无法加载数据。请运行爬虫程序。');
            }
            
            allItems = window.lostItems;
            const filterInfo = window.filterInfo || { region: '전국', startDate: '-', endDate: '-' };
            
            totalCount.innerText = allItems.length;
            
            if (dateRangeSpan) {
                dateRangeSpan.innerText = `${filterInfo.startDate} ~ ${filterInfo.endDate}`;
            }
            
            renderView();
            
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }, 800);

        } catch (error) {
            console.error(error);
            itemsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem;"><p style="color: #ef4444; font-size: 1.2rem;">${error.message}</p></div>`;
            loader.style.display = 'none';
        }
    }

    // 뷰 렌더링 결정
    function renderView(filteredItems = null) {
        const items = filteredItems || allItems;
        if (currentView === 'card') {
            itemsGrid.style.display = 'grid';
            itemsTableWrapper.style.display = 'none';
            renderCards(items);
        } else {
            itemsGrid.style.display = 'none';
            itemsTableWrapper.style.display = 'block';
            renderTable(items);
        }
    }

    // 카드 렌더링 - 9:16 다중 페이지 분할 적용
    function renderCards(items) {
        itemsGrid.innerHTML = '';
        if (items.length === 0) {
            itemsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-sub);">没有搜索结果。</p>';
            return;
        }

        // 3열 레이아웃이므로 한 9:16 블록당 12개 할당 (3x4)
        const ITEMS_PER_PAGE_CARD = 12; // 3x4 layout
        for (let i = 0; i < items.length; i += ITEMS_PER_PAGE_CARD) {
            const pageItems = items.slice(i, i + ITEMS_PER_PAGE_CARD);
            
            // 9:16 래퍼 생성
            const wrapper = document.createElement('div');
            wrapper.className = 'table-page-916';
            
            // 실제 카드들이 담길 이너 그리드 생성
            const innerGrid = document.createElement('div');
            innerGrid.style.display = 'grid';
            // 3열 x 4행 하드코딩
            innerGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            innerGrid.style.gap = '0.25rem';
            
            pageItems.forEach((item, index) => {
                const card = document.createElement('article');
                card.className = 'card';
                card.id = `item-${i + index}`;
                card.innerHTML = `
                    <div class="card-img-wrap">
                        <img src="${item.image}" alt="${item.title}" loading="lazy" onclick="openImageModal('${item.image}')" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';">
                    </div>
                `;
                innerGrid.appendChild(card);
            });
            
            wrapper.appendChild(innerGrid);
            itemsGrid.appendChild(wrapper);
        }
    }

    // 테이블 렌더링 (엑셀 방식) - 9:16 분할 렌더링
    function renderTable(items) {
        const pagesContainer = document.getElementById('table-pages-container');
        if (!pagesContainer) return;
        pagesContainer.innerHTML = '';
        
        if (items.length === 0) {
            pagesContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-sub);">没有收集到数据。</div>';
            return;
        }

        // 스마트폰 캡처를 고려하여 9:16 비율 화면에 들어갈 수 있도록 8개씩 분할
        const ITEMS_PER_PAGE = 8; 
        for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
            const pageItems = items.slice(i, i + ITEMS_PER_PAGE);
            const pageDiv = document.createElement('div');
            pageDiv.className = 'table-page-916';
            
            let trs = '';
            pageItems.forEach((item) => {
                const yy = item.date.substring(2, 4);
                const mm = item.date.substring(5, 7);
                const dd = item.date.substring(8, 10);
                const shortDate = `${yy}/${mm}/${dd}`;
                trs += `
                    <tr>
                        <td style="width: 45px;"><img src="${item.image}" class="table-img" onclick="openImageModal('${item.image}')" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';"></td>
                        <td style="font-weight: 600;">${item.title}</td>
                        <td>${shortDate}</td>
                        <td>${item.place || '-'}</td>
                    </tr>
                `;
            });

            pageDiv.innerHTML = `
                <table class="excel-table">
                    <thead>
                        <tr>
                            <th style="width: 45px;">图片</th>
                            <th>物品名称</th>
                            <th>拾获日期</th>
                            <th>拾获地点</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trs}
                    </tbody>
                </table>
            `;
            pagesContainer.appendChild(pageDiv);
        }
    }

    // 검색 기능
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allItems.filter(item => 
                item.title.toLowerCase().includes(query) || 
                (item.category && item.category.toLowerCase().includes(query)) ||
                (item.place && item.place.toLowerCase().includes(query))
            );
            renderView(filtered);
        });
    }

    // 뷰 전환 이벤트
    btnCard.addEventListener('click', () => {
        currentView = 'card';
        btnCard.classList.add('active');
        btnTable.classList.remove('active');
        renderView();
    });

    btnTable.addEventListener('click', () => {
        currentView = 'table';
        btnTable.classList.add('active');
        btnCard.classList.remove('active');
        renderView();
    });

    // 엑셀(CSV) 내보내기
    btnExport.addEventListener('click', () => {
        if (allItems.length === 0) return alert('没有可导出的数据。');
        
        const headers = ['物品名称', '拾获日期', '拾获地点', '存储位置', '类别'];
        const rows = allItems.map((item) => [
            `"${item.title.replace(/"/g, '""')}"`,
            item.date,
            `"${(item.place || '').replace(/"/g, '""')}"`,
            `"${(item.storage || '').replace(/"/g, '""')}"`,
            `"${(item.category || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `LostItems_Jeju_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 크롤링 버튼 로직 (실제 크롤링은 터미널 환경 필요)
    if (btnCrawl) {
        btnCrawl.addEventListener('click', () => {
            btnCrawl.classList.add('loading');
            btnCrawl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> 同步中...`;
            
            // 실제 환경에서는 백엔드 API 호출이 필요함.
            // 여기서는 사용자에게 가이드 제공 및 가상 딜레이
            setTimeout(() => {
                alert('数据同步已开始。请稍후刷新页面。\n(本地环境: 需要配置 node execution/crawl_lost_items.js 在后台运行)');
                btnCrawl.classList.remove('loading');
                btnCrawl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> 同步数据`;
            }, 1500);
        });
    }

    loadData();
});

// 전역 캡처 함수 (샤오홍슈용 - 사용 시 개별 캡처)
async function captureCard(cardId, fileName) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.add('share-mode');
    try {
        const canvas = await html2canvas(card, {
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            scale: 2
        });
        const link = document.createElement('a');
        link.download = `Share_${fileName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('Capture failed:', err);
    } finally {
        card.classList.remove('share-mode');
    }
}

// 전역 캡처 함수 (현재 표시된 뷰의 각 9:16 페이지를 각각 이미지로 캡처)
async function captureCurrentView() {
    let targetContainer = null;
    let titlePrefix = '';
    
    if (currentView === 'card') {
        targetContainer = document.getElementById('items-grid');
        titlePrefix = '卡片视图';
    } else {
        targetContainer = document.getElementById('table-pages-container');
        titlePrefix = '表格视图';
    }
    
    if (!targetContainer) return;

    const pages = targetContainer.querySelectorAll('.table-page-916');
    if (pages.length === 0) {
        alert('没有可以保存的内容。');
        return;
    }

    const btn = document.getElementById('btn-capture-table');
    const originalText = btn.innerHTML;
    btn.innerHTML = '处理中...';
    btn.disabled = true;

    for (let i = 0; i < pages.length; i++) {
        const pageDom = pages[i];

        const captureWrapper = document.createElement('div');
        captureWrapper.style.position = 'absolute';
        captureWrapper.style.left = '-9999px';
        captureWrapper.style.top = '0';
        captureWrapper.style.background = '#ffffff';
        captureWrapper.style.padding = '40px';
        captureWrapper.style.width = '1080px';
        
        const title = document.createElement('h2');
        title.innerText = `拾获的遗失物品 - ${titlePrefix} (${new Date().toLocaleDateString()}) - ${i+1}/${pages.length}`;
        title.style.textAlign = 'center';
        title.style.marginBottom = '30px';
        title.style.fontSize = '2.5rem';
        title.style.color = '#111';
        captureWrapper.appendChild(title);

        const clonedPage = pageDom.cloneNode(true);
        // 강제 폰트 색상 및 스타일 적용 (캡처 화질 향상)
        clonedPage.querySelectorAll('th, td, .card, .title').forEach(el => {
            el.style.color = 'black';
        });
        
        // 캡처 화면에서는 모바일 화면 크기와 관계없이 강제로 9:16 고정 박스 형태 유지
        clonedPage.style.color = 'black';
        clonedPage.style.aspectRatio = '9 / 16';
        clonedPage.style.overflow = 'hidden';
        clonedPage.style.margin = '0 auto';
        clonedPage.style.display = currentView === 'card' ? 'grid' : 'block';
        
        captureWrapper.appendChild(clonedPage);
        document.body.appendChild(captureWrapper);

        try {
            const canvas = await html2canvas(captureWrapper, {
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#ffffff",
                scale: 2,
                logging: false,
                imageTimeout: 10000
            });
            const link = document.createElement('a');
            link.download = `Jeju_LostItems_Page${i+1}_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // 모바일/브라우저 다운로드 연달아 수행 시 막힘 방지 딜레이
            await new Promise(r => setTimeout(r, 600));
        } catch (err) {
            console.error(`Capture failed for page ${i+1}:`, err);
        } finally {
            document.body.removeChild(captureWrapper);
        }
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// 이미지 확대 관련 전역 함수
function openImageModal(imgSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    if (modal && modalImg) {
        modalImg.src = imgSrc;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // 스크롤 복원
    }
}

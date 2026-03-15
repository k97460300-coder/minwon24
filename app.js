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

    let allItems = [];
    let currentView = 'card';

    // 데이터 로드
    function loadData() {
        try {
            if (!window.lostItems) {
                throw new Error('无法加载数据。请运行爬虫程序。');
            }
            
            allItems = window.lostItems;
            const filterInfo = window.filterInfo || { region: '전국', startDate: '-', endDate: '-' };
            
            totalCount.innerText = allItems.length;
            updateDate.innerText = new Date().toLocaleDateString('zh-CN');
            
            if (filterBadge && dateRangeSpan) {
                dateRangeSpan.innerText = `${filterInfo.region} | ${filterInfo.startDate} ~ ${filterInfo.endDate}`;
                filterBadge.style.display = 'inline-block';
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

    // 카드 렌더링
    function renderCards(items) {
        itemsGrid.innerHTML = '';
        if (items.length === 0) {
            itemsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-sub);">没有搜索结果。</p>';
            return;
        }

        items.forEach((item, index) => {
            const card = document.createElement('article');
            card.className = 'card';
            card.id = `item-${index}`;
            card.innerHTML = `
                <div class="card-img-wrap">
                    <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';">
                    <span class="card-date">${item.date}</span>
                </div>
                <div class="card-body">
                    <div class="category">${item.category || '其他物品'}</div>
                    <h3 class="title">${item.title}</h3>
                    <div class="info-row"><span class="label">拾获地点</span><span class="val">${item.place || '-'}</span></div>
                    <div class="info-row" style="margin-bottom: 1.2rem;"><span class="label">保管地点</span><span class="val">${item.storage || '-'}</span></div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-share" onclick="captureCard('item-${index}', '${item.title}')">小红书专用截图</button>
                    </div>
                </div>
            `;
            itemsGrid.appendChild(card);
        });
    }

    // 테이블 렌더링 (엑셀 방식)
    function renderTable(items) {
        tableBody.innerHTML = '';
        if (items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-sub);">没有收集到数据。</td></tr>';
            return;
        }

        items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><img src="${item.image}" class="table-img" onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';"></td>
                <td style="font-weight: 600;">${item.title}</td>
                <td>${item.date}</td>
                <td>${item.place || '-'}</td>
                <td>${item.storage || '-'}</td>
                <td><span style="color: var(--accent); font-weight: 500;">保管中</span></td>
            `;
            tableBody.appendChild(tr);
        });
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
        
        const headers = ['序号', '物品名称', '拾获日期', '拾获地点', '保管地点', '类别'];
        const rows = allItems.map((item, idx) => [
            idx + 1,
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
                alert('数据同步已开始。请稍后刷新页面。\n(本地环境: 需要配置 node execution/crawl_lost_items.js 在后台运行)');
                btnCrawl.classList.remove('loading');
                btnCrawl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> 同步数据`;
            }, 1500);
        });
    }

    loadData();
});

// 전역 캡처 함수 (샤오홍슈용)
async function captureCard(cardId, fileName) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.add('share-mode');
    try {
        const canvas = await html2canvas(card, {
            useCORS: false,
            allowTaint: true,
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

// 테이블 캡처 함수 (4:3 비율)
async function captureTable() {
    const tableWrapper = document.getElementById('items-table-wrapper');
    if (!tableWrapper) return;
    
    // 4:3 비율을 위한 임시 래퍼 생성
    const captureWrapper = document.createElement('div');
    captureWrapper.style.padding = '40px';
    captureWrapper.style.backgroundColor = 'white';
    captureWrapper.style.width = '1200px'; // 고정 너비
    captureWrapper.style.height = '900px'; // 4:3 비율 (1200 * 3/4)
    captureWrapper.style.display = 'flex';
    captureWrapper.style.flexDirection = 'column';
    captureWrapper.style.position = 'fixed';
    captureWrapper.style.top = '-9999px';
    
    const title = document.createElement('h1');
    title.innerText = '济州特别自治道 拾获物 列表';
    title.style.color = '#1f2937';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    captureWrapper.appendChild(title);

    const cloneTable = document.getElementById('items-table').cloneNode(true);
    cloneTable.style.backgroundColor = 'white';
    cloneTable.style.color = 'black';
    cloneTable.style.border = '1px solid #e5e7eb';
    // 폰트 색상 강제 조정
    cloneTable.querySelectorAll('th, td').forEach(el => {
        el.style.color = 'black';
        el.style.borderColor = '#e5e7eb';
    });
    captureWrapper.appendChild(cloneTable);

    document.body.appendChild(captureWrapper);

    try {
        const canvas = await html2canvas(captureWrapper, {
            useCORS: false,
            allowTaint: true,
            backgroundColor: "#ffffff",
            scale: 2
        });
        const link = document.createElement('a');
        link.download = `Jeju_LostItems_Table_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('Table capture failed:', err);
    } finally {
        document.body.removeChild(captureWrapper);
    }
}

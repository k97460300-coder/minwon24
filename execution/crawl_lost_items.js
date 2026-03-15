const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function crawlLostItems() {
    // 기본 날짜 설정 (최근 3일치 수집)
    const today = new Date();
    const lastThreeDays = new Date();
    lastThreeDays.setDate(today.getDate() - 3);
    
    // API에 맞는 YYYYMMDD000000 형식
    const formatDateApi = (date, isEnd = false) => {
        const ymd = date.toISOString().split('T')[0].replace(/-/g, '');
        return isEnd ? ymd + "235959" : ymd + "000000";
    };

    const startDate = formatDateApi(lastThreeDays);
    const endDate = formatDateApi(today);
    const simpleStartDate = startDate.slice(0, 8);
    const simpleEndDate = endDate.slice(0, 8);
    
    console.log(`[CRAWL] Period: ${simpleStartDate} ~ ${simpleEndDate}`);
    console.log(`[CRAWL] Region: Jeju Special Self-Governing Province (LCP000)`);

    const apiUrl = "https://minwon24.police.go.kr/wisenut/search.do";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json;charset=UTF-8",
        "Referer": "https://minwon24.police.go.kr/cvlcpt/cvlcptAply.do?cvlcptId=MW-201&keyword="
    };

    let allItems = [];
    const pageCount = 20; // 한 번에 가져올 개수

    try {
        // API 요청 페이로드
        const payload = {
            "query": "",
            "searchFields": ["_ALL_"],
            "resultFields": ["_ALL_"],
            "collections": ["FOUND"],
            "pageStart": 1,
            "pageCount": pageCount.toString(),
            "orderBys": ["DATE/DESC"],
            "subQueries": {
                "MODE": "DETAIL",
                "SNIPPET_SIZE": "200",
                "HL_TERM": "",
                "FOUND_FILTER_QUERY": "<PKUP_RGN_SE_CD:match:LCP000>",
                "FOUND_COLLECTION_QUERY": "",
                "START_DATE": startDate,
                "END_DATE": endDate
            }
        };

        const response = await axios.post(apiUrl, payload, { headers, timeout: 20000 });
        const result = response.data;

        if (result && result.result && result.result.outputs && result.result.outputs.FOUND) {
            const documents = result.result.outputs.FOUND.documents || [];
            console.log(`[CRAWL] Found ${documents.length} items from API.`);

            documents.forEach(doc => {
                const fields = doc.fields || {};
                const item = {
                    id: fields.PKUP_CMDTY_MNG_ID,
                    title: fields.ITEM_CN,
                    date: fields.LOST_CMDTY_PKUP_YMD,
                    category: fields.PRDLST_NM || "기타",
                    place: fields.PKUP_PLC_SE_NM,
                    storage: fields.KPNG_PLC_NM,
                    owner: fields.TEL || "-", // 연락처 우선
                    image: `https://minwon24.police.go.kr/lost112Minwon/selectLostInfoAttachFile.do?pkupCmdtyMngId=${fields.PKUP_CMDTY_MNG_ID}&fileId=${fields.STRG_FILE_PATH}`
                };

                // 제목 정제 (숫자 접두사 제거)
                if (item.title) {
                    item.title = item.title.replace(/^\d+\.?\s*/, '');
                }

                if (item.id && item.title) {
                    allItems.push(item);
                }
            });
        } else {
            console.log("[CRAWL] No data found in API response.");
        }

    } catch (error) {
        console.error(`[ERROR] API Request failed: ${error.message}`);
    }

    // 중복 제거
    let uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

    // Fallback: 여전히 데이터가 없는 경우 (시스템 확인용)
    if (uniqueItems.length === 0) {
        console.log("[WARN] No real items found for Jeju. Adding sample data.");
        uniqueItems = [
            {
                id: "SAMPLE_001",
                title: "[샘플] 검정색 가죽 지갑",
                date: new Date().toISOString().split('T')[0],
                category: "지갑",
                place: "제주공항",
                storage: "제주공항경찰대",
                owner: "064-000-0000",
                image: "https://minwon24.police.go.kr/img/error/lostNonImg_2.png"
            }
        ];
    }

    // 파일 저장
    const dataJsPath = path.join(__dirname, '..', 'data.js');
    const dataJsContent = `window.lostItems = ${JSON.stringify(uniqueItems, null, 2)};\nwindow.filterInfo = { region: '제주특별자치도', startDate: '${simpleStartDate}', endDate: '${simpleEndDate}' };`;
    fs.writeFileSync(dataJsPath, dataJsContent, 'utf-8');

    const csvPath = path.join(__dirname, '..', '.tmp', 'lost_items.csv');
    const csvHeaders = ['id', 'title', 'date', 'category', 'place', 'storage', 'owner', 'image'];
    const csvRows = uniqueItems.map(item => csvHeaders.map(h => `"${(item[h] || '-').toString().replace(/"/g, '""')}"`).join(','));
    const csvContent = '\uFEFF' + csvHeaders.join(',') + '\n' + csvRows.join('\n');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    console.log(`Successfully saved ${uniqueItems.length} items.`);
}

crawlLostItems();

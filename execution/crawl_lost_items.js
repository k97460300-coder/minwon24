const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function crawlLostItems() {
    // 기본 날짜 설정 (최근 30일치 수집)
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);
    
    // API에 맞는 YYYYMMDD000000 형식
    const formatDateApi = (date, isEnd = false) => {
        const ymd = date.toISOString().split('T')[0].replace(/-/g, '');
        return isEnd ? ymd + "235959" : ymd + "000000";
    };

    const startDate = formatDateApi(lastMonth);
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

    const translateMap = {
        // Categories
        "지갑": "钱包", "현금": "现金", "카드": "卡片", "휴대폰": "手机", "신분증": "身份证件",
        "가방": "包", "귀금속": "珠宝", "도서용품": "图书用品", "서류": "文件", "산업용품": "工业用品",
        "쇼핑백": "购物袋", "스포츠용품": "运动用品", "악기": "乐器", "의류": "衣服", "자동차": "汽车",
        "전자기기": "电子设备", "컴퓨터": "电脑", "필기도구": "文具", "기타물품": "其他物品", "기타": "其他",
        "남성용": "男士", "여성용": "女士", "유아용": "婴儿", "스마트폰": "智能手机", "체크카드": "借记卡",
        "신용카드": "信用卡", "일반지갑": "钱包", "반지": "戒指", "목걸이": "项链", "귀걸이": "耳环",

        // Title terms
        "검정색": "黑色", "검정": "黑色", "빨간색": "红色", "파란색": "蓝色", "흰색": "白色",
        "노란색": "黄色", "초록색": "绿色", "보라색": "紫色", "가죽": "皮革", "아이폰": "iPhone",
        "갤럭시": "Galaxy", "지갑": "钱包", "가방": "包", "열쇠": "钥匙", "안경": "眼镜",
        "장갑": "手套", "우산": "雨伞", "신발": "鞋", "카드": "卡", "만원": "1万韩元",
        "오만원": "5万韩元", "천원": "1千韩원", "오천원": "5천韩원", "동전": "硬币",
        "습득": "拾获", "보관": "保管", "분실": "丢失", "발견": "发现"
    };

    const translate = (text) => {
        if (!text) return text;
        let translated = text;
        Object.keys(translateMap).forEach(ko => {
            const reg = new RegExp(ko, 'g');
            translated = translated.replace(reg, translateMap[ko]);
        });
        return translated;
    };

    let allItems = [];
    let pageStart = 1;

    // 이미지 저장 폴더 준비
    const imagesDir = path.join(__dirname, '..', 'images');
    try {
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
    } catch (e) {
        console.warn(`[WARN] Could not create images directory: ${e.message}`);
    }

    async function downloadImage(url, destPath) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
            fs.writeFileSync(destPath, response.data);
            return true;
        } catch (e) {
            console.error(`[WARN] Failed to download image ${url} - ${e.message}`);
            return false;
        }
    }

    const pageCount = 1000;
    let totalCount = 0;

    try {
        while (true) {
            console.log(`[CRAWL] Fetching page starting at ${pageStart}...`);
            const payload = {
                "query": "",
                "searchFields": ["_ALL_"],
                "resultFields": ["_ALL_"],
                "collections": ["FOUND"],
                "pageStart": pageStart,
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
                const foundOutput = result.result.outputs.FOUND;
                totalCount = parseInt(foundOutput.totalCount || "0");
                const documents = foundOutput.documents || [];
                
                console.log(`[CRAWL] Received ${documents.length} documents for page starting at ${pageStart}`);

                if (pageStart === 1) {
                    console.log(`[CRAWL] Total items reported by API: ${totalCount}`);
                }

                for (const doc of documents) {
                    const fields = doc.fields || {};
                    const id = fields.PKUP_CMDTY_MNG_ID;
                    const originalImageUrl = `https://minwon24.police.go.kr/lost112Minwon/selectLostInfoAttachFile.do?pkupCmdtyMngId=${id}&fileId=${fields.STRG_FILE_PATH}`;

                    const item = {
                        id: id,
                        title: fields.ITEM_CN, 
                        date: fields.LOST_CMDTY_PKUP_YMD,
                        category: translate(fields.PRDLST_NM || "기타"),
                        place: fields.PKUP_PLC_SE_NM,
                        storage: fields.KPNG_PLC_NM,
                        owner: fields.TEL || "-",
                        image: originalImageUrl // Fallback URL
                    };

                    // 제목 정제 (숫자 접두사 제거)
                    if (item.title) {
                        item.title = item.title.replace(/^\d+\.?\s*/, '');
                    }

                    // 이미지가 있는 항목(STRG_FILE_PATH가 존재하는 항목)만 추가
                    if (item.id && item.title && fields.STRG_FILE_PATH) {
                        const localImgName = `${item.id}.jpg`;
                        const localImgPath = path.join(imagesDir, localImgName);
                        
                        // 이미지 1건 다운로드
                        const dlSuccess = await downloadImage(originalImageUrl, localImgPath);
                        if (dlSuccess) {
                            item.image = `images/${localImgName}`;
                            allItems.push(item);
                        } else {
                            // 다운로드 실패 시 오리지널 링크 그대로 푸시하거나 스킵
                            allItems.push(item);
                        }
                    }
                }

                pageStart += pageCount;
                if (pageStart > totalCount || documents.length === 0) {
                    break;
                }
            } else {
                break;
            }
        }
    } catch (error) {
        console.error(`[ERROR] API Request failed: ${error.message}`);
    }

    let uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());

    if (uniqueItems.length === 0 && totalCount === 0) {
        uniqueItems = [
            {
                id: "SAMPLE_001",
                title: "[샘플] 검정색 가죽 지갑",
                date: new Date().toISOString().split('T')[0],
                category: "钱包",
                place: "济州机场",
                storage: "济州机场警察队",
                owner: "064-000-0000",
                image: "https://minwon24.police.go.kr/img/error/lostNonImg_2.png"
            }
        ];
    }

    const dataJsPath = path.join(__dirname, '..', 'data.js');
    const dataJsContent = `window.lostItems = ${JSON.stringify(uniqueItems, null, 2)};\nwindow.filterInfo = { region: '济州特别自治道', startDate: '${simpleStartDate}', endDate: '${simpleEndDate}' };`;
    fs.writeFileSync(dataJsPath, dataJsContent, 'utf-8');

    const csvPath = path.join(__dirname, '..', '.tmp', 'lost_items.csv');
    const csvHeaders = ['id', 'title', 'date', 'category', 'place', 'storage', 'owner', 'image'];
    const csvRows = uniqueItems.map(item => csvHeaders.map(h => `"${(item[h] || '-').toString().replace(/"/g, '""')}"`).join(','));
    const csvContent = '\uFEFF' + csvHeaders.join(',') + '\n' + csvRows.join('\n');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    console.log(`Successfully saved ${uniqueItems.length} items (Total in API: ${totalCount}).`);
}

crawlLostItems();

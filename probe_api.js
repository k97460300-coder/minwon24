const axios = require('axios');

async function probe() {
    const apiUrl = "https://minwon24.police.go.kr/wisenut/search.do";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json;charset=UTF-8"
    };

    const testPages = [1, 2, 21, 101];
    const pageCount = 20;

    for (const start of testPages) {
        console.log(`--- Testing pageStart: ${start}, pageCount: ${pageCount} ---`);
        const payload = {
            "query": "",
            "searchFields": ["_ALL_"],
            "resultFields": ["_ALL_"],
            "collections": ["FOUND"],
            "pageStart": start,
            "pageCount": pageCount.toString(),
            "orderBys": ["DATE/DESC"],
            "subQueries": {
                "MODE": "DETAIL",
                "FOUND_FILTER_QUERY": "<PKUP_RGN_SE_CD:match:LCP000>",
                "START_DATE": "20260312000000",
                "END_DATE": "20260315235959"
            }
        };

        try {
            const res = await axios.post(apiUrl, payload, { headers });
            const docs = res.data.result.outputs.FOUND.documents || [];
            console.log(`Received: ${docs.length} documents. Total reported: ${res.data.result.outputs.FOUND.totalCount}`);
            if (docs.length > 0) {
                console.log(`First item ID: ${docs[0].fields.PKUP_CMDTY_MNG_ID}`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

probe();

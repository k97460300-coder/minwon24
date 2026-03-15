const axios = require('axios');

async function probe() {
    const apiUrl = "https://minwon24.police.go.kr/wisenut/search.do";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json;charset=UTF-8"
    };

    const payload = (start, count) => ({
        "query": "",
        "searchFields": ["_ALL_"],
        "resultFields": ["_ALL_"],
        "collections": ["FOUND"],
        "pageStart": start,
        "pageCount": count.toString(),
        "orderBys": ["DATE/DESC"],
        "subQueries": {
            "MODE": "DETAIL",
            "SNIPPET_SIZE": "200",
            "HL_TERM": "",
            "FOUND_FILTER_QUERY": "<PKUP_RGN_SE_CD:match:LCP000>",
            "FOUND_COLLECTION_QUERY": "",
            "START_DATE": "20260312000000",
            "END_DATE": "20260315235959"
        }
    });

    try {
        console.log("--- Fetching items 1-4 (pageStart=1, pageCount=4) ---");
        const res1 = await axios.post(apiUrl, payload(1, 4), { headers });
        const docs1 = res1.data.result.outputs.FOUND.documents;
        console.log(`IDs: ${docs1.map(d => d.fields.PKUP_CMDTY_MNG_ID).join(', ')}`);

        console.log("--- Fetching items 3-4 (If pageStart=2 is page number, count=2) ---");
        const res2 = await axios.post(apiUrl, payload(2, 2), { headers });
        const docs2 = res2.data.result.outputs.FOUND.documents;
        console.log(`IDs: ${docs2.map(d => d.fields.PKUP_CMDTY_MNG_ID).join(', ')}`);

        if (docs1.length >= 4 && docs2.length >= 2) {
            const match = docs1[2].fields.PKUP_CMDTY_MNG_ID === docs2[0].fields.PKUP_CMDTY_MNG_ID;
            console.log(`Hypothesis confirmed: ${match ? "YES (pageStart is page number)" : "NO"}`);
        }

    } catch (e) {
        console.log(e.message);
    }
}

probe();

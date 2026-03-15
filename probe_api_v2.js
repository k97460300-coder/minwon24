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
        console.log("--- Case A: pageStart=1, pageCount=2 ---");
        const resA = await axios.post(apiUrl, payload(1, 2), { headers });
        const docsA = resA.data.result.outputs.FOUND.documents;
        console.log(`IDs: ${docsA.map(d => d.fields.PKUP_CMDTY_MNG_ID).join(', ')}`);

        console.log("--- Case B: pageStart=2, pageCount=1 ---");
        const resB = await axios.post(apiUrl, payload(2, 1), { headers });
        const docsB = resB.data.result.outputs.FOUND.documents;
        console.log(`ID: ${docsB.map(d => d.fields.PKUP_CMDTY_MNG_ID).join(', ')}`);

        console.log("--- Case C: pageStart=3, pageCount=1 ---");
        const resC = await axios.post(apiUrl, payload(3, 1), { headers });
        const docsC = resC.data.result.outputs.FOUND.documents;
        console.log(`ID: ${docsC.map(d => d.fields.PKUP_CMDTY_MNG_ID).join(', ')}`);

    } catch (e) {
        console.log(e.message);
    }
}

probe();

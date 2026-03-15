# 크롤링 지시서: 경찰청 습득물 수집

본 지시서는 경찰청 유실물 통합포털의 최근 습득물 데이터를 정기적으로 수집하는 절차를 정의합니다.

## 목표
- 최근 등록된 습득물 정보(제목, 습득일자, 장소, 이미지 URL 등) 수집
- 웹 대시보드 및 구글 시트에서 즉시 사용할 수 있는 형식(JSON, CSV)으로 저장
- 제목의 불필요한 숫자 접두사 제거

## 도구 및 환경
- **실행 환경**: Node.js (추천) 또는 Python
- **실행 스크립트**: `node execution/crawl_lost_items.js`
- **주요 라이브러리**: `axios`, `cheerio` (Node.js) / `requests`, `beautifulsoup4` (Python)

## 입력 자료
- **대상 URL**: `https://minwon24.police.go.kr/cvlcpt/cvlcptAply.do?cvlcptId=MW-201&keyword=`

## 단계별 절차
1. `node execution/crawl_lost_items.js` 실행 (제주특별자치도 `LCP000` 지역 고정 수집)
2. 대상 페이지의 HTML을 파싱하여 `ul.krds-card-list li.krds-card-list-item` 요소를 순회
3. 각 항목에서 상세 정보를 추출하고 제목 앞의 숫자(예: "1. ")를 제거
4. 수집된 데이터를 다음 경로에 저장:
    - `data.js`: 대시보드 UI 연동용
    - `.tmp/lost_items.csv`: 구글 시트 호환용 (BOM 포함 UTF-8)

## 데이터 구조 (JSON 기준)
```json
[
  {
    "id": "MNG_ID",
    "title": "물품명",
    "date": "2026-03-15",
    "image": "https://...",
    "category": "지갑 > 여성용",
    "place": "습득 장소",
    "storage": "보관 장소",
    "owner": "분실자명"
  }
]
```

## 예외 처리
- 네트워크 연결 실패 시 타임아웃 처리 (15초)
- 이미지가 없는 경우 기본 에러 이미지(`lostNonImg_2.png`) 유지
- 중복 데이터는 `id` 또는 `title`을 기준으로 제거

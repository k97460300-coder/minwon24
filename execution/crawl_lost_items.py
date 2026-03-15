import requests
from bs4 import BeautifulSoup
import json
import os
import csv
import re
import time

def crawl_lost_items():
    # 메인 리스트 URL (검색 결과 페이지)
    url = "https://minwon24.police.go.kr/cvlcpt/cvlcptAply.do?cvlcptId=MW-201&keyword="
    base_url = "https://minwon24.police.go.kr"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    items = []
    
    try:
        # 최근 등록된 데이터 확보를 위해 첫 3페이지만 크롤링 (필요시 늘릴 수 있음)
        for page in range(1, 4):
            print(f"Crawling page {page}...")
            params = {
                "pageIndex": page
            }
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 메인 카드 리스트 아이템 탐색
            card_items = soup.select('ul.krds-card-list li.krds-card-list-item')
            
            if not card_items:
                print(f"No items found on page {page}. Stopping.")
                break

            for card in card_items:
                item = {}
                
                # 제목 추출 및 전처리 (숫자 접두사 제거)
                tit_elem = card.select_one('.krds-card-title')
                if tit_elem:
                    title = tit_elem.text.strip()
                    # "1. ", "2." 등의 패턴 제거
                    title = re.sub(r'^\d+\.?\s*', '', title)
                    item['title'] = title
                
                # 이미지 추출
                img_elem = card.select_one('.krds-card-image img')
                if img_elem and 'src' in img_elem.attrs:
                    src = img_elem['src']
                    if src.startswith('/'):
                        item['image'] = base_url + src
                    else:
                        item['image'] = src
                else:
                    item['image'] = base_url + "/img/error/lostNonImg_2.png"
                
                # 상세 정보 추출 (분류, 습득일자, 장소 등)
                desc_list = card.select('.krds-card-desc-list dt')
                for dt in desc_list:
                    key = dt.text.strip()
                    dd = dt.find_next_sibling('dd')
                    if not dd:
                        continue
                    val = dd.text.strip()
                    
                    if '분류' in key:
                        item['category'] = val
                    elif '습득일자' in key:
                        item['date'] = val
                    elif '습득장소' in key:
                        item['place'] = val
                    elif '보관장소' in key:
                        item['storage'] = val
                    elif '분실자' in key:
                        item['owner'] = val

                # 상세 보기 ID (onclick 파싱)
                btn = card.select_one('button[onclick]')
                if btn and 'onclick' in btn.attrs:
                    onclick = btn['onclick']
                    match = re.search(r"'(.*?)'", onclick)
                    if match:
                        item['id'] = match.group(1)
                
                if item.get('title'):
                    items.append(item)
            
            # 서버 부하 방지
            time.sleep(0.5)
        
        # 중복 제거 (ID 기준)
        seen_ids = set()
        unique_items = []
        for it in items:
            if it.get('id') and it['id'] not in seen_ids:
                unique_items.append(it)
                seen_ids.add(it['id'])
            elif not it.get('id'): # ID가 없는 경우 제목과 날짜로 판단 (드문 경우)
                unique_items.append(it)

        # 1. JSON 저장
        os.makedirs('.tmp', exist_ok=True)
        json_path = os.path.join('.tmp', 'lost_items.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(unique_items, f, ensure_ascii=False, indent=2)
            
        # 2. CSV 저장 (Google Sheets 호환용)
        csv_path = os.path.join('.tmp', 'lost_items.csv')
        fieldnames = ['id', 'title', 'date', 'category', 'place', 'storage', 'owner', 'image']
        with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f: # utf-8-sig for Excel compatibility
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in unique_items:
                # CSV에 포함되지 않은 필드는 빈칸으로 처리
                csv_row = {field: row.get(field, '-') for field in fieldnames}
                writer.writerow(csv_row)
            
        print(f"Successfully collected {len(unique_items)} items.")
        print(f"Saved to JSON: {json_path}")
        print(f"Saved to CSV : {csv_path}")
        return True

    except Exception as e:
        print(f"Error during crawling: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    crawl_lost_items()

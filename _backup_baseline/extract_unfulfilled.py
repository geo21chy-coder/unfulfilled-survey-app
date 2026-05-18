import pandas as pd
import json
import os
import requests
import time

def load_coordinates_cache(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def main():
    base_dir = r"c:\Users\Administrator\Desktop\프로젝트\미이행현장조사"
    excel_path = os.path.join(base_dir, "통계페이지", "DB.xlsx")
    coord_path = os.path.join(base_dir, "조사위치표시", "coordinates_cache.json")
    output_path = os.path.join(base_dir, "unfulfilled-app", "src", "data", "unfulfilled_data.json")

    # Load cache
    coord_cache = load_coordinates_cache(coord_path)

    # Load DB
    print(f"Loading {excel_path}...")
    df = pd.read_excel(excel_path)

    # Find columns (assuming headers are on first row)
    # C column is index 2
    c_col = df.columns[2]
    u_col = df.columns[20]
    ab_col = df.columns[27]

    print(f"Filtering by column: {c_col}")

    # Filter '미이행' in C column
    # Handle NaN values before matching
    unfulfilled_df = df[df[c_col].fillna('').str.contains('미이행')]
    
    print(f"Found {len(unfulfilled_df)} unfulfilled records.")

    result = []
    missing_coords = 0
    kakao_key = "b7125ae325bd4ee22f638045992b7db7"

    for idx, row in unfulfilled_df.iterrows():
        name = str(row.iloc[4]) if pd.notna(row.iloc[4]) else "알 수 없음"
        jibun = str(row.iloc[5]) if pd.notna(row.iloc[5]) else ""
        doro = str(row.iloc[6]) if pd.notna(row.iloc[6]) else ""
        
        address = jibun if jibun else doro

        remarks = str(row.iloc[46]) if pd.notna(row.iloc[46]) else ""

        # Column U and AB
        u_val = str(row.iloc[20]) if pd.notna(row.iloc[20]) else ""
        ab_val = str(row.iloc[27]) if pd.notna(row.iloc[27]) else ""

        lat, lng = None, None
        
        search_addr = jibun if jibun else doro
        # Clean up address a bit for search (remove parentheses)
        clean_addr = search_addr.split('(')[0].strip() if '(' in search_addr else search_addr
        
        # Check coordinates cache using addresses
        if search_addr in coord_cache:
            lat = coord_cache[search_addr]['lat']
            lng = coord_cache[search_addr]['lng']
        elif doro in coord_cache:
            lat = coord_cache[doro]['lat']
            lng = coord_cache[doro]['lng']
        else:
            # fetch from Kakao API
            try:
                headers = {"Authorization": f"KakaoAK {kakao_key}"}
                params = {"query": clean_addr}
                resp = requests.get("https://dapi.kakao.com/v2/local/search/address.json", params=params, headers=headers)
                data = resp.json()
                if data.get('documents') and len(data['documents']) > 0:
                    y = data['documents'][0]['y']
                    x = data['documents'][0]['x']
                    lat, lng = float(y), float(x)
                    coord_cache[search_addr] = {"lat": lat, "lng": lng}
                else:
                    # Retry with doro if jibun failed
                    clean_doro = doro.split('(')[0].strip() if '(' in doro else doro
                    params = {"query": clean_doro}
                    resp = requests.get("https://dapi.kakao.com/v2/local/search/address.json", params=params, headers=headers)
                    data = resp.json()
                    if data.get('documents') and len(data['documents']) > 0:
                        y = data['documents'][0]['y']
                        x = data['documents'][0]['x']
                        lat, lng = float(y), float(x)
                        coord_cache[search_addr] = {"lat": lat, "lng": lng}
                    else:
                        missing_coords += 1
            except Exception as e:
                print(f"Error fetching coord for {clean_addr}: {e}")
                missing_coords += 1
            time.sleep(0.1) # Rate limit protection

        record = {
            "id": int(row.iloc[0]) if pd.notna(row.iloc[0]) else 0,
            "name": name,
            "address": address,
            "remarks": remarks,
            "parking_unfulfilled": u_val == '미이행',
            "charger_unfulfilled": ab_val == '미이행',
            "lat": lat,
            "lng": lng
        }
        result.append(record)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    with open(coord_path, 'w', encoding='utf-8') as f:
        json.dump(coord_cache, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(result)} records to {output_path}.")
    print(f"Missing coordinates for {missing_coords} records.")

if __name__ == '__main__':
    main()

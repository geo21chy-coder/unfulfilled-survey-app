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
    excel_path = os.path.join(base_dir, "DB.xlsx")
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

        # Column B, P, Q
        category = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ""
        req_parking = str(row.iloc[15]).replace('.0', '') if pd.notna(row.iloc[15]) else ""
        sum_parking = str(row.iloc[16]).replace('.0', '') if pd.notna(row.iloc[16]) else ""

        # Column U and AB
        u_val = str(row.iloc[20]) if pd.notna(row.iloc[20]) else ""
        ab_val = str(row.iloc[27]) if pd.notna(row.iloc[27]) else ""

        # Column V, X (Charger Ratio)
        req_charger = str(row.iloc[21]).replace('.0', '') if pd.notna(row.iloc[21]) and str(row.iloc[21]) != 'nan' else ""
        sum_charger = str(row.iloc[23]).replace('.0', '') if pd.notna(row.iloc[23]) and str(row.iloc[23]) != 'nan' else ""
        
        # Column I, J (Total Parking)
        total_parking = str(row.iloc[8]).replace('.0', '') if pd.notna(row.iloc[8]) and str(row.iloc[8]) != 'nan' else ""
        if not total_parking:
            total_parking = str(row.iloc[9]).replace('.0', '') if pd.notna(row.iloc[9]) and str(row.iloc[9]) != 'nan' else ""
            
        # Column K (Permit Date)
        permit_date = str(row.iloc[10]) if pd.notna(row.iloc[10]) and str(row.iloc[10]) != 'nan' else ""
        if permit_date.endswith(" 00:00:00"):
            permit_date = permit_date.split(" ")[0]
            
        # Column N (Public Facility)
        is_public_val = str(row.iloc[13]).strip() if pd.notna(row.iloc[13]) and str(row.iloc[13]) != 'nan' else ""
        is_public = "공공" if is_public_val else ""
        
        # Column AM, AN (Contact)
        contact_am = str(row.iloc[38]).replace('.0', '') if pd.notna(row.iloc[38]) and str(row.iloc[38]) != 'nan' else ""
        contact_an = str(row.iloc[39]).replace('.0', '') if pd.notna(row.iloc[39]) and str(row.iloc[39]) != 'nan' else ""
        contact = ""
        if contact_am and contact_an:
            contact = f"{contact_am} / {contact_an}"
        elif contact_am:
            contact = contact_am
        elif contact_an:
            contact = contact_an
            
        # Survey 1 (AP, AQ, AR)
        survey1_check = str(row.iloc[41]).strip() if pd.notna(row.iloc[41]) and str(row.iloc[41]) != 'nan' else ""
        survey1_plan = str(row.iloc[42]).strip() if pd.notna(row.iloc[42]) and str(row.iloc[42]) != 'nan' else ""
        survey1_note = str(row.iloc[43]).strip() if pd.notna(row.iloc[43]) and str(row.iloc[43]) != 'nan' else ""

        # Survey 2 (AV, AW, AX)
        survey2_check = str(row.iloc[47]).strip() if pd.notna(row.iloc[47]) and str(row.iloc[47]) != 'nan' else ""
        survey2_plan = str(row.iloc[48]).strip() if pd.notna(row.iloc[48]) and str(row.iloc[48]) != 'nan' else ""
        survey2_note = str(row.iloc[49]).strip() if pd.notna(row.iloc[49]) and str(row.iloc[49]) != 'nan' else ""

        # Survey 3 (BB, BC, BD)
        survey3_check = str(row.iloc[53]).strip() if pd.notna(row.iloc[53]) and str(row.iloc[53]) != 'nan' else ""
        survey3_plan = str(row.iloc[54]).strip() if pd.notna(row.iloc[54]) and str(row.iloc[54]) != 'nan' else ""
        survey3_note = str(row.iloc[55]).strip() if pd.notna(row.iloc[55]) and str(row.iloc[55]) != 'nan' else ""
        
        # Survey 4 (BH, BI, BJ)
        survey4_check = str(row.iloc[59]).strip() if pd.notna(row.iloc[59]) and str(row.iloc[59]) != 'nan' else ""
        survey4_plan = str(row.iloc[60]).strip() if pd.notna(row.iloc[60]) and str(row.iloc[60]) != 'nan' else ""
        survey4_note = str(row.iloc[61]).strip() if pd.notna(row.iloc[61]) and str(row.iloc[61]) != 'nan' else ""

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
            "category": category,
            "name": name,
            "address": address,
            "remarks": remarks,
            "parking_unfulfilled": u_val == '미이행',
            "charger_unfulfilled": ab_val == '미이행',
            "req_parking": req_parking,
            "sum_parking": sum_parking,
            "req_charger": req_charger,
            "sum_charger": sum_charger,
            "total_parking": total_parking,
            "permit_date": permit_date,
            "is_public": is_public,
            "contact": contact,
            "survey1_check": survey1_check,
            "survey1_plan": survey1_plan,
            "survey1_note": survey1_note,
            "survey2_check": survey2_check,
            "survey2_plan": survey2_plan,
            "survey2_note": survey2_note,
            "survey3_check": survey3_check,
            "survey3_plan": survey3_plan,
            "survey3_note": survey3_note,
            "survey4_check": survey4_check,
            "survey4_plan": survey4_plan,
            "survey4_note": survey4_note,
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

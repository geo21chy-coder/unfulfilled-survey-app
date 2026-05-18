import pandas as pd

df = pd.read_excel('DB.xlsx', sheet_name='통합관리')

def find_col_by_value(df, values):
    for col in df.columns:
        if df[col].astype(str).str.contains('|'.join(values)).any():
            return col
    return None

cols_to_find = {
    '시설구분': ['공공', '상업'],
    '이행여부': ['이행', '미이행'],
    '주차_의무': ['의무', '주차'],
    '충전_의무': ['의무', '충전']
}

mapping = {}
for key, vals in cols_to_find.items():
    found = find_col_by_value(df, vals)
    mapping[key] = found

print("Mapping found:")
for key, col in mapping.items():
    if col:
        print(f"{key} -> Index {df.columns.get_loc(col)}: {col}")
    else:
        print(f"{key} -> Not Found")

# Let's also print all column names to a file with safe encoding
with open('columns_debug.txt', 'w', encoding='utf-8') as f:
    for i, col in enumerate(df.columns):
        f.write(f"{i}: {col}\n")

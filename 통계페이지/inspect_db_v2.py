import pandas as pd

df = pd.read_excel('DB.xlsx', sheet_name='통합관리')
with open('db_sample.txt', 'w', encoding='utf-8') as f:
    f.write("Columns and first row values:\n")
    for i, col in enumerate(df.columns):
        val = df.iloc[0, i]
        f.write(f"{i}: {col} -> {val}\n")

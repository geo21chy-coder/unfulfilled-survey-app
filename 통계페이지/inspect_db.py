import pandas as pd
import sys

try:
    df = pd.read_excel('DB.xlsx', sheet_name='통합관리')
    with open('db_info.txt', 'w', encoding='utf-8') as f:
        f.write("Columns:\n")
        for i, col in enumerate(df.columns):
            f.write(f"{i}: {col}\n")
        f.write("\nFirst 5 rows:\n")
        f.write(df.head().to_string())
    print("Successfully wrote db_info.txt")
except Exception as e:
    print(f"Error: {e}")

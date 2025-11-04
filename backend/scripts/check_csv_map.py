import os
from enrich_nutrition import load_taco_csv_map, normalize_name

def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    print('project_root:', root)
    mapping = load_taco_csv_map(root)
    print('csv_map_len:', len(mapping))
    key = normalize_name('Arroz, integral, cru')
    print('has_key_Arroz_integral_cru:', key in mapping)
    # Show a few sample keys to visualize normalization
    sample = list(mapping.keys())[:10]
    print('sample_keys:', sample)

if __name__ == '__main__':
    main()
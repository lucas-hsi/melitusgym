import argparse
import os
import sys

import pandas as pd


def normalize_headers(df: pd.DataFrame) -> pd.DataFrame:
    """Renomeia colunas do XLSX TACO para o schema padronizado do projeto.

    Saída contém apenas as colunas esperadas por taco_foods.
    """
    # Normalização básica para comparação
    def norm(s: str) -> str:
        import unicodedata
        s2 = unicodedata.normalize("NFKD", str(s)).encode("ASCII", "ignore").decode("ASCII")
        return s2.strip().lower()

    cols = {norm(c): c for c in df.columns}

    def find(*keywords):
        for key, orig in cols.items():
            if all(k in key for k in keywords):
                return orig
        return None

    mapping = {
        "name_pt": find("alimento") or find("descricao") or find("nome"),
        "category_pt": find("grupo") or find("categoria"),
        "energy_kcal_100g": find("energia", "kcal") or find("kcal"),
        "energy_kj_100g": find("energia", "kj") or find("kj"),
        "carbohydrates_100g": find("carbo", "g") or find("carboidratos"),
        "proteins_100g": find("proteina"),
        "fat_100g": find("lipidio") or find("gordura"),
        "fiber_100g": find("fibra"),
        "sugars_100g": find("acucar") or find("açucar") or find("sacarose"),
        "sodium_mg_100g": find("sodio") or find("sódio"),
        "glycemic_index": find("indice", "glicemico") or find("ig"),
    }

    # Seleciona e renomeia as colunas detectadas
    selected = {}
    for target, src in mapping.items():
        if src is not None and src in df.columns:
            selected[target] = df[src]
        else:
            selected[target] = pd.Series([None] * len(df))

    out = pd.DataFrame(selected)
    # Limpeza final: remover linhas sem nome
    out["name_pt"] = out["name_pt"].astype(str).str.strip()
    out = out[out["name_pt"] != ""]
    return out


def main():
    parser = argparse.ArgumentParser(description="Exporta TACO XLSX para CSV leve (taco_export.csv)")
    parser.add_argument("--xlsx", default=os.path.join(os.path.dirname(__file__), "../../Taco-4a-Edicao.xlsx"), help="Caminho do XLSX de entrada")
    parser.add_argument("--csv", default=os.path.join(os.path.dirname(__file__), "../../taco_export.csv"), help="Caminho do CSV de saída")
    args = parser.parse_args()

    xlsx_path = os.path.abspath(args.xlsx)
    csv_path = os.path.abspath(args.csv)

    if not os.path.exists(xlsx_path):
        print(f"ERRO: XLSX não encontrado: {xlsx_path}")
        sys.exit(1)

    # Carrega a primeira planilha
    try:
        df = pd.read_excel(xlsx_path, engine="openpyxl")
    except Exception as e:
        print(f"ERRO ao ler XLSX: {e}")
        sys.exit(1)

    # Normaliza headers e salva CSV
    out = normalize_headers(df)
    out.to_csv(csv_path, index=False)
    print(f"CSV gerado: {csv_path} ({len(out)} linhas)")


if __name__ == "__main__":
    main()
import argparse
import csv
import os
import sys
from typing import Optional

from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Float
from sqlalchemy.dialects.postgresql import insert as pg_insert


def parse_float(val: Optional[str]) -> Optional[float]:
    if val is None:
        return None
    try:
        if isinstance(val, (int, float)):
            return float(val)
        v = str(val).replace(",", ".").strip()
        if v == "" or v.lower() in ("na", "nd", "n/a", "-"):
            return None
        return float(v)
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(description="Ingestão CSV TACO para PostgreSQL (Railway)")
    parser.add_argument("--csv", default=os.path.join(os.path.dirname(__file__), "../../taco_export.csv"), help="Caminho do CSV fonte")
    parser.add_argument("--db", default=os.getenv("DATABASE_URL"), help="URL do banco PostgreSQL (DATABASE_URL)")
    args = parser.parse_args()

    csv_path = os.path.abspath(args.csv)
    db_url = args.db

    if not os.path.exists(csv_path):
        print(f"ERRO: CSV não encontrado: {csv_path}")
        sys.exit(1)

    if not db_url:
        print("ERRO: DATABASE_URL não definido. Configure a conexão da Railway.")
        sys.exit(1)

    engine = create_engine(db_url)
    metadata = MetaData()

    taco_foods = Table(
        "taco_foods",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("name_pt", String, nullable=False),
        Column("category_pt", String),
        Column("energy_kcal_100g", Float),
        Column("energy_kj_100g", Float),
        Column("carbohydrates_100g", Float),
        Column("proteins_100g", Float),
        Column("fat_100g", Float),
        Column("fiber_100g", Float),
        Column("sugars_100g", Float),
        Column("sodium_mg_100g", Float),
        Column("glycemic_index", Float),
    )

    # Não criamos tabela; assumimos migração já aplicada
    with engine.begin() as conn:
        inserted = 0
        updated = 0
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                payload = {
                    "name_pt": (row.get("name_pt") or "").strip(),
                    "category_pt": (row.get("category_pt") or None),
                    "energy_kcal_100g": parse_float(row.get("energy_kcal_100g")),
                    "energy_kj_100g": parse_float(row.get("energy_kj_100g")),
                    "carbohydrates_100g": parse_float(row.get("carbohydrates_100g")),
                    "proteins_100g": parse_float(row.get("proteins_100g")),
                    "fat_100g": parse_float(row.get("fat_100g")),
                    "fiber_100g": parse_float(row.get("fiber_100g")),
                    "sugars_100g": parse_float(row.get("sugars_100g")),
                    "sodium_mg_100g": parse_float(row.get("sodium_mg_100g")),
                    "glycemic_index": parse_float(row.get("glycemic_index")),
                }

                if not payload["name_pt"]:
                    continue

                stmt = pg_insert(taco_foods).values(**payload)
                upsert_stmt = stmt.on_conflict_do_update(
                    index_elements=["name_pt"],
                    set_={
                        "category_pt": payload["category_pt"],
                        "energy_kcal_100g": payload["energy_kcal_100g"],
                        "energy_kj_100g": payload["energy_kj_100g"],
                        "carbohydrates_100g": payload["carbohydrates_100g"],
                        "proteins_100g": payload["proteins_100g"],
                        "fat_100g": payload["fat_100g"],
                        "fiber_100g": payload["fiber_100g"],
                        "sugars_100g": payload["sugars_100g"],
                        "sodium_mg_100g": payload["sodium_mg_100g"],
                        "glycemic_index": payload["glycemic_index"],
                    },
                )
                res = conn.execute(upsert_stmt)
                # rowcount pode ser 1 para insert ou update; não distingue facilmente
                inserted += 1

        print(f"Ingestão concluída. Processados: {inserted} linhas (upsert).")


if __name__ == "__main__":
    main()
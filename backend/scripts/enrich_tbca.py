#!/usr/bin/env python3
"""
Enriquecimento TBCA da tabela TACOFood no PostgreSQL.

Lê um CSV (derivado dos PDFs TBCA/TACO) e atualiza campos existentes
na tabela `taco_food` (SQLModel: TACOFood), como `glycemic_index` e
ajustes opcionais de nutrientes por 100g.

Uso:
  python backend/scripts/enrich_tbca.py --csv ./data/tbca_enrich.csv \
         [--match ref_code|name] [--dry-run]

CSV esperado (header, separador vírgula):
  name_pt,glycemic_index,ref_code,carbohydrates_100g,proteins_100g,fat_100g,
  fiber_100g,sugars_100g,sodium_mg_100g,category_pt,source_version

Observações:
  - `ref_code` é a chave preferida para match; caso ausente, usa `name_pt`.
  - Atualiza apenas campos presentes em cada linha (não-nulos).
  - Conexão ao banco obtida de app.services.database (env: USE_SQLITE=false,
    DATABASE_URL=postgresql://...)
"""

import os
import csv
import sys
import argparse
from typing import Dict, Any, Optional

from sqlmodel import Session, select

# Garantir que possamos importar os módulos do backend
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from app.services.database import engine  # respeita USE_SQLITE/DATABASE_URL
from app.models.taco_food import TACOFood


FIELD_MAP = {
    "glycemic_index": "glycemic_index",
    "carbohydrates_100g": "carbohydrates_100g",
    "proteins_100g": "proteins_100g",
    "fat_100g": "fat_100g",
    "fiber_100g": "fiber_100g",
    "sugars_100g": "sugars_100g",
    "sodium_mg_100g": "sodium_mg_100g",
    "category_pt": "category_pt",
    "source_version": "source_version",
}


def parse_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", ".")
    if s == "" or s.lower() in {"na", "null", "none"}:
        return None
    try:
        return float(s)
    except Exception:
        return None


def enrich_from_csv(csv_path: str, match_key: str = "ref_code", dry_run: bool = False) -> Dict[str, Any]:
    if not os.path.isfile(csv_path):
        raise FileNotFoundError(f"CSV não encontrado: {csv_path}")

    updated = 0
    not_found = 0
    processed = 0

    with Session(engine) as session:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                processed += 1

                name_pt = (row.get("name_pt") or "").strip()
                ref_code = (row.get("ref_code") or "").strip()

                target: Optional[TACOFood] = None
                if match_key == "ref_code" and ref_code:
                    target = session.exec(
                        select(TACOFood).where(TACOFood.ref_code == ref_code)
                    ).first()
                if target is None and name_pt:
                    # Match por nome (case-insensitive)
                    target = session.exec(
                        select(TACOFood).where(TACOFood.name_pt.ilike(name_pt))
                    ).first()

                if target is None:
                    not_found += 1
                    continue

                # Preparar atualizações
                changes: Dict[str, Any] = {}
                for csv_field, model_field in FIELD_MAP.items():
                    val = row.get(csv_field)
                    if val is None or (isinstance(val, str) and val.strip() == ""):
                        continue
                    # Converter floats onde aplicável
                    if model_field.endswith("_100g") or model_field in {"glycemic_index"}:
                        parsed = parse_float(val)
                        if parsed is None:
                            continue
                        changes[model_field] = parsed
                    else:
                        changes[model_field] = str(val)

                if not changes:
                    continue

                # Aplicar alterações
                for k, v in changes.items():
                    setattr(target, k, v)

                if not dry_run:
                    session.add(target)
                    # commit por lote minimiza I/O, mas manter simples aqui
                    session.commit()

                updated += 1

    return {
        "processed": processed,
        "updated": updated,
        "not_found": not_found,
        "dry_run": dry_run,
        "csv": csv_path,
        "match_key": match_key,
    }


def main():
    parser = argparse.ArgumentParser(description="Enriquecimento TBCA/TACO para TACOFood")
    parser.add_argument("--csv", required=True, help="Caminho do CSV de enriquecimento")
    parser.add_argument("--match", choices=["ref_code", "name"], default="ref_code",
                        help="Chave de match prioritária (default: ref_code)")
    parser.add_argument("--dry-run", action="store_true", help="Executa sem persistir mudanças")
    args = parser.parse_args()

    # Garantir Postgres
    use_sqlite = os.getenv("USE_SQLITE", "true").lower()
    if use_sqlite == "true":
        print("⚠️ USE_SQLITE=true — configure USE_SQLITE=false e DATABASE_URL=postgresql://...")
        sys.exit(2)

    stats = enrich_from_csv(args.csv, match_key=("ref_code" if args.match == "ref_code" else "name"), dry_run=args.dry_run)
    print("📈 Enriquecimento TBCA concluído:")
    print(f"  CSV: {stats['csv']}")
    print(f"  Match: {stats['match_key']}")
    print(f"  Processados: {stats['processed']}")
    print(f"  Atualizados: {stats['updated']}")
    print(f"  Não encontrados: {stats['not_found']}")
    print(f"  Dry-run: {stats['dry_run']}")


if __name__ == "__main__":
    main()
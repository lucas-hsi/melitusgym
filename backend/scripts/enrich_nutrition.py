"""
Script de Complementação Nutricional (PostgreSQL) — Melitus Gym
================================================================

Função:
- Conecta ao Postgres usando `DATABASE_URL` (via `.env`/ambiente).
- Busca itens na tabela `taco_foods` com nutrientes essenciais faltando.
- Completa apenas os campos ausentes usando dados reais da TACO (taco_export.csv).
- Fallback opcional: dicionário Python para poucos itens conhecidos.
- Gera um resumo ao final com contagem de atualizações por nutriente.

Campos considerados (por 100g):
- `energy_kcal_100g` (kcal)
- `carbohydrates_100g` (g)
- `proteins_100g` (g)
- `fat_100g` (g)
- `fiber_100g` (g)
- `sugars_100g` (g) [se disponível]
- `sodium_mg_100g` (mg)

Observações:
- Não altera `name_pt` nem valores já existentes; atualiza somente `None`/vazios.
- Usa dados reais do arquivo `taco_export.csv` presente na raiz do repo.

Uso:
  # Carrega .env e executa contra Postgres
  python backend/scripts/enrich_nutrition.py --dry-run false

  # Opcional: apenas simular (sem UPDATE)
  python backend/scripts/enrich_nutrition.py --dry-run true
"""

import os
import csv
import argparse
from typing import Dict, Any, Optional, Tuple
import unicodedata
from difflib import SequenceMatcher

from dotenv import load_dotenv
from sqlmodel import Session, select

from app.services.database import get_engine
from app.models.taco_food import TACOFood


ESSENTIAL_FIELDS = [
    "energy_kcal_100g",
    "carbohydrates_100g",
    "proteins_100g",
    "fat_100g",
    "fiber_100g",
    "sugars_100g",
    "sodium_mg_100g",
]


def parse_float(val: Any) -> Optional[float]:
    """Converte string/valor para float robusto, aceitando vírgula decimal."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if s == "" or s.lower() in {"nan", "null", "none"}:
        return None
    # Extrai apenas dígitos, vírgula e ponto; converte vírgula para ponto
    cleaned = "".join(c for c in s if c.isdigit() or c in ",.-")
    cleaned = cleaned.replace(".", ".")  # mantem ponto
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except Exception:
        return None


def _strip_accents(s: str) -> str:
    """Remove acentos de forma robusta sem dependências extras."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))

def normalize_name(name: str) -> str:
    """Normaliza o nome para comparação consistente (lower, sem acentos, sem pontuação redundante)."""
    base = _strip_accents(name or "").lower().strip()
    # Remover aspas e pontuações comuns
    for ch in ['"', "'", ",", ";", ":", "/", "(", ")"]:
        base = base.replace(ch, " ")
    # Colapsar espaços e remover duplos
    return " ".join(base.split())


def load_taco_csv_map(repo_root: str) -> Dict[str, Dict[str, Optional[float]]]:
    """Carrega taco_export.csv e mapeia por `name_pt` normalizado → dict de nutrientes."""
    csv_path = os.path.join(repo_root, "taco_export.csv")
    mapping: Dict[str, Dict[str, Optional[float]]] = {}
    if not os.path.exists(csv_path):
        print(f"⚠️  Arquivo taco_export.csv não encontrado em {csv_path}. Prosseguindo sem CSV.")
        return mapping

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Ignorar linhas de descrição/cabeçalho duplicado
            name_pt = (row.get("name_pt") or "").strip()
            if not name_pt or "Descrição" in name_pt:
                continue

            norm = normalize_name(name_pt)
            mapping[norm] = {
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
    return mapping


# Fallback mínimo (valores reais conhecidos). Use apenas quando CSV não cobrir.
FALLBACK_DICT: Dict[str, Dict[str, Optional[float]]]= {
    # Exemplo: valores médios referenciais por 100g
    normalize_name("Banana, prata, crua"): {
        "energy_kcal_100g": 89.0,
        "carbohydrates_100g": 22.8,
        "proteins_100g": 1.1,
        "fat_100g": 0.3,
        "fiber_100g": 2.6,
        "sugars_100g": 12.2,
        "sodium_mg_100g": 1.0,
    },
}


def _best_fuzzy_match(norm: str, csv_map: Dict[str, Dict[str, Optional[float]]], threshold: float = 0.88) -> Optional[Tuple[str, Dict[str, Optional[float]]]]:
    """Encontra melhor correspondência aproximada usando SequenceMatcher.
    Retorna (chave_csv, valores) quando a similaridade >= threshold.
    """
    best_key = None
    best_score = 0.0
    for key in csv_map.keys():
        score = SequenceMatcher(None, norm, key).ratio()
        if score > best_score:
            best_key = key
            best_score = score
    if best_key and best_score >= threshold:
        return best_key, csv_map[best_key]
    return None

def get_source_values(name_pt: str, csv_map: Dict[str, Dict[str, Optional[float]]]) -> Optional[Dict[str, Optional[float]]]:
    """Obtém valores de nutrientes do CSV; tenta exato; fallback fuzzy; por fim dicionário."""
    norm = normalize_name(name_pt)
    # Match exato
    if norm in csv_map:
        return csv_map[norm]
    # Fuzzy (alta precisão)
    fuzzy = _best_fuzzy_match(norm, csv_map, threshold=0.90)
    if fuzzy:
        return fuzzy[1]
    # Fallback mínimo
    return FALLBACK_DICT.get(norm)


def enrich_missing(dry_run: bool = False) -> Dict[str, int]:
    """Realiza complementação dos campos ausentes e retorna contagem por nutriente."""
    # Carrega .env e CSV a partir da RAIZ do projeto
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    load_dotenv(os.path.join(project_root, ".env"))

    engine = get_engine()
    csv_map = load_taco_csv_map(project_root)

    counters: Dict[str, int] = {k: 0 for k in ESSENTIAL_FIELDS}
    total_items = 0

    with Session(engine) as session:
        # Seleciona itens com alguma coluna essencial nula
        stmt = select(TACOFood).where(
            (TACOFood.energy_kcal_100g == None) |
            (TACOFood.carbohydrates_100g == None) |
            (TACOFood.proteins_100g == None) |
            (TACOFood.fat_100g == None) |
            (TACOFood.fiber_100g == None) |
            (TACOFood.sugars_100g == None) |
            (TACOFood.sodium_mg_100g == None)
        )

        results = session.exec(stmt).all()
        total_items = len(results)
        print(f"Encontrados {total_items} alimentos com nutrientes faltantes.")

        updated_rows = 0
        for food in results:
            source_vals = get_source_values(food.name_pt, csv_map)
            if not source_vals:
                # Sem valores para este alimento; prosseguir
                continue

            changed = False
            for field in ESSENTIAL_FIELDS:
                current_val = getattr(food, field, None)
                source_val = source_vals.get(field)
                if (current_val is None) and (source_val is not None):
                    setattr(food, field, source_val)
                    counters[field] += 1
                    changed = True

            if changed:
                updated_rows += 1
                if not dry_run:
                    session.add(food)

        if not dry_run and updated_rows > 0:
            session.commit()

    print(f"Atualizações aplicadas: {updated_rows} itens.")
    return counters


def main():
    parser = argparse.ArgumentParser(description="Complementação nutricional para taco_foods (Postgres)")
    parser.add_argument("--dry-run", type=str, default="false", help="true para simular sem UPDATE")
    args = parser.parse_args()

    dry_run = args.dry_run.strip().lower() == "true"
    if dry_run:
        print("Modo simulação ativado (nenhum UPDATE será aplicado).")

    counters = enrich_missing(dry_run=dry_run)

    print("\nResumo por nutriente atualizado:")
    for field, count in counters.items():
        print(f" - {field}: {count}")

    print("\nObservação: apenas campos originalmente nulos foram preenchidos. Nome e kcal existentes não foram alterados.")


if __name__ == "__main__":
    main()
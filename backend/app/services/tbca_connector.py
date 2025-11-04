import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import requests
from bs4 import BeautifulSoup

from sqlmodel import Session, select
from app.models.taco_food import TACOFood
from .database import engine
from .taco_dynamic_loader import TACODynamicLoader

logger = logging.getLogger(__name__)


class TBCAConnector:
    """Conector para fallback TBCA online com normalização e upsert no banco.

    - Busca itens no site TBCA.
    - Para os primeiros itens, obtém detalhes nutricionais.
    - Normaliza campos para o padrão TACO (por 100g).
    - Faz upsert no banco local para uso futuro.
    """

    SEARCH_URL = "https://www.tbca.net.br/base-dados/composicao_alimentos.php"

    def __init__(self, timeout: int = 12):
        self.timeout = timeout
        self.loader = TACODynamicLoader()

    def _headers(self) -> Dict[str, str]:
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    def _search_list(self, term: str, limit: int) -> List[Dict[str, Any]]:
        params = {
            "txt_descricao": term,
            "txt_codigo": "",
            "cmbgrupo": "SELECIONE",
            "cmbsubgrupo": "SELECIONE",
        }
        r = requests.get(self.SEARCH_URL, params=params, headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        soup = BeautifulSoup(r.content, "html.parser")
        foods: List[Dict[str, Any]] = []
        table = soup.find("table", class_="tbca-table") or soup.find("table")
        if not table:
            return foods
        for row in table.find_all("tr"):
            tds = row.find_all("td")
            if len(tds) < 2:
                continue
            code_el = tds[0].find("a")
            name_el = tds[1].find("a") or tds[1]
            if not code_el or not name_el:
                continue
            code = code_el.get_text(strip=True)
            name = name_el.get_text(separator=" ", strip=True)
            detail = code_el.get("href", "")
            if detail and not detail.startswith("http"):
                detail = f"https://www.tbca.net.br/base-dados/{detail}"
            foods.append({"id": f"tbca_{code.lower()}", "code": code, "name": name, "url": detail})
            if len(foods) >= limit:
                break
        return foods

    def _fetch_details(self, detail_url: str) -> Dict[str, Optional[float]]:
        if not detail_url:
            return {}
        r = requests.get(detail_url, headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        soup = BeautifulSoup(r.content, "html.parser")
        # tabela nutricional
        table = soup.find("table", class_="table-nutricional")
        if not table:
            tables = soup.find_all("table")
            table = tables[0] if tables else None
        nutrients = {
            "energy_kcal": None,
            "proteins_100g": None,
            "carbohydrates_100g": None,
            "fiber_100g": None,
            "fat_100g": None,
            "sodium_mg_100g": None,
        }
        if table:
            for row in table.find_all("tr"):
                cols = row.find_all("td")
                if len(cols) < 2:
                    continue
                n_name = cols[0].get_text(strip=True).lower()
                n_val = cols[1].get_text(strip=True)
                try:
                    v_str = "".join(c for c in n_val if c.isdigit() or c in ",.")
                    v_str = v_str.replace(",", ".")
                    v = float(v_str) if v_str else None
                except Exception:
                    v = None
                if "energia" in n_name or "kcal" in n_name:
                    nutrients["energy_kcal"] = v
                elif "prote" in n_name:
                    nutrients["proteins_100g"] = v
                elif "carbo" in n_name:
                    nutrients["carbohydrates_100g"] = v
                elif "fibra" in n_name:
                    nutrients["fiber_100g"] = v
                elif "lip" in n_name or "gordura" in n_name:
                    nutrients["fat_100g"] = v
                elif "sódio" in n_name or "sodium" in n_name:
                    nutrients["sodium_mg_100g"] = v
        return nutrients

    def _to_db_rows(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for it in items:
            name_pt = it.get("name")
            group = it.get("group")
            n = it.get("nutrients", {})
            energy_kcal = n.get("energy_kcal")
            energy_kj = energy_kcal * 4.184 if isinstance(energy_kcal, (int, float)) else None
            rows.append({
                "name_pt": name_pt,
                "category_pt": group,
                "energy_kcal_100g": energy_kcal,
                "energy_kj_100g": energy_kj,
                "carbohydrates_100g": n.get("carbohydrates_100g"),
                "proteins_100g": n.get("proteins_100g"),
                "fat_100g": n.get("fat_100g"),
                "fiber_100g": n.get("fiber_100g"),
                "sugars_100g": None,
                "sodium_mg_100g": n.get("sodium_mg_100g"),
                "glycemic_index": None,
            })
        return rows

    def _to_response_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        resp: List[Dict[str, Any]] = []
        for it in items:
            n = it.get("nutrients", {})
            resp.append({
                "id": it.get("id", "0"),
                "source": "tbca_online",
                "name": it.get("name"),
                "brands": None,
                "serving_size": None,
                "serving_quantity": None,
                "nutrients_per_100g": {
                    "energy_kcal": n.get("energy_kcal"),
                    "energy_kj": (n.get("energy_kcal") * 4.184) if isinstance(n.get("energy_kcal"), (int, float)) else None,
                    "carbohydrates": n.get("carbohydrates_100g"),
                    "proteins": n.get("proteins_100g"),
                    "fat": n.get("fat_100g"),
                    "fiber": n.get("fiber_100g"),
                    "sugars": None,
                    "sodium": n.get("sodium_mg_100g"),
                    "salt": None,
                },
                "nutriscore": None,
                "ecoscore": None,
                "data_type": "TBCA",
                "glycemic_index": None,
                "category": it.get("group")
            })
        return resp

    async def search_foods(self, term: str, page_size: int = 20) -> Dict[str, Any]:
        start = datetime.now()
        try:
            logger.info(f"🔎 TBCA fallback: buscando '{term}' (limit={page_size})")
            base_list = self._search_list(term, page_size)
            if not base_list:
                return {"items": [], "total_found": 0}

            # fetch details for each item (bounded by page_size)
            enriched: List[Dict[str, Any]] = []
            for it in base_list[:page_size]:
                nutrients = self._fetch_details(it.get("url"))
                it["nutrients"] = nutrients
                enriched.append(it)

            # upsert into DB for local reuse
            rows = self._to_db_rows(enriched)
            try:
                upserted = self.loader._upsert_db_items(rows)  # reuse existing helper
                logger.info(f"TBCA fallback: upserted {upserted} registros no banco")
            except Exception as e:
                logger.warning(f"TBCA fallback: falha no upsert - {e}")

            items_resp = self._to_response_items(enriched)
            elapsed = round((datetime.now() - start).total_seconds() * 1000, 2)
            return {
                "items": items_resp,
                "total_found": len(items_resp),
                "sources": ["tbca_online"],
                "search_time_ms": elapsed,
            }
        except requests.RequestException as e:
            logger.warning(f"TBCA fallback: indisponível - {e}")
            return {"items": [], "total_found": 0}
        except Exception as e:
            logger.error(f"TBCA fallback: erro - {e}")
            return {"items": [], "total_found": 0}
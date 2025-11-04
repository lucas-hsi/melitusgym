import os
from dotenv import load_dotenv
from sqlmodel import Session, select

from app.services.database import get_engine
from app.models.taco_food import TACOFood


def main():
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    load_dotenv(os.path.join(project_root, ".env"))

    engine = get_engine()
    fields = [
        'energy_kcal_100g','carbohydrates_100g','proteins_100g',
        'fat_100g','fiber_100g','sugars_100g','sodium_mg_100g'
    ]
    with Session(engine) as session:
        total = session.exec(select(TACOFood)).all()
        print(f"Total de registros: {len(total)}")
        counts = {f:0 for f in fields}
        for food in total:
            for f in fields:
                if getattr(food, f) is None:
                    counts[f] += 1
        print("Registros com valor NULL por campo:")
        for f,c in counts.items():
            print(f" - {f}: {c}")

if __name__ == '__main__':
    main()
import os
from dotenv import load_dotenv
from sqlmodel import Session, select

from app.services.database import get_engine
from app.models.taco_food import TACOFood


def main():
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    load_dotenv(os.path.join(project_root, ".env"))

    engine = get_engine()

    with Session(engine) as session:
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
        print(f"Total com campos faltantes: {len(results)}")
        for food in results[:30]:
            print(f"- id={food.id} | name_pt={food.name_pt} | category_pt={food.category_pt}")

        # Checar um caso específico
        target = session.exec(select(TACOFood).where(TACOFood.name_pt == 'Arroz, integral, cru')).first()
        if target:
            print("\nAmostra 'Arroz, integral, cru':")
            for fld in [
                'energy_kcal_100g','carbohydrates_100g','proteins_100g',
                'fat_100g','fiber_100g','sugars_100g','sodium_mg_100g']:
                print(f"  {fld} -> {getattr(target, fld)}")

        target2 = session.exec(select(TACOFood).where(TACOFood.name_pt == 'Arroz, tipo 1, cozido')).first()
        if target2:
            print("\nAmostra 'Arroz, tipo 1, cozido':")
            for fld in [
                'energy_kcal_100g','carbohydrates_100g','proteins_100g',
                'fat_100g','fiber_100g','sugars_100g','sodium_mg_100g']:
                print(f"  {fld} -> {getattr(target2, fld)}")

        target3 = session.exec(select(TACOFood).where(TACOFood.name_pt == 'Biscoito, doce, maisena')).first()
        if target3:
            print("\nAmostra 'Biscoito, doce, maisena':")
            for fld in [
                'energy_kcal_100g','carbohydrates_100g','proteins_100g',
                'fat_100g','fiber_100g','sugars_100g','sodium_mg_100g']:
                print(f"  {fld} -> {getattr(target3, fld)}")


if __name__ == "__main__":
    main()
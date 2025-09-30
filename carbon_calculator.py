# carbon_calculator.py

def carbon_savings(waste_processed_tons):
    # assume 1 ton waste -> 0.6 ton biochar
    # each ton biochar sequesters 2.5 tons CO2
    biochar = waste_processed_tons * 0.6
    co2_saved = biochar * 2.5
    return biochar, co2_saved

if __name__ == "__main__":
    waste = 500  # per hub annually
    biochar, co2 = carbon_savings(waste)
    print(f"From {waste} tons of waste:")
    print(f"- Biochar produced: {biochar:.1f} tons")
    print(f"- CO2 avoided: {co2:.1f} tons")

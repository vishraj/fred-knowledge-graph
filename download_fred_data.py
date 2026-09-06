import os
import requests
import json
import sys
from dotenv import load_dotenv

load_dotenv()

# Define the FRED series IDs we want to download for our mock graph
SERIES_MAP = {
    'cpi': 'CPIAUCSL',             # Consumer Price Index for All Urban Consumers
    'wages': 'LES1252881600Q',     # Employed full time: Median usual weekly real earnings
    'mortgage_rates': 'MORTGAGE30US', # 30-Year Fixed Rate Mortgage Average
    'price_changes': 'CSUSHPINSA', # S&P/CoreLogic Case-Shiller U.S. National Home Price Index
    'employment': 'PAYEMS'         # All Employees, Total Nonfarm
}

FRED_API_URL = "https://api.stlouisfed.org/fred/series/observations"

def fetch_series_data(api_key, series_id):
    params = {
        'series_id': series_id,
        'api_key': api_key,
        'file_type': 'json',
        'observation_start': '2019-01-01' # Last 5 years
    }
    print(f"Fetching data for {series_id}...")
    response = requests.get(FRED_API_URL, params=params)
    if response.status_code == 200:
        data = response.json()
        observations = data.get('observations', [])
        # Extract just date and value
        return [{'date': obs['date'], 'value': obs['value']} for obs in observations if obs['value'] != '.']
    else:
        print(f"Failed to fetch {series_id}: {response.status_code} - {response.text}")
        return []

def main():
    api_key = os.environ.get("FRED_API_KEY")
    if not api_key:
        print("Error: FRED_API_KEY environment variable not set.")
        print("Please set it using: export FRED_API_KEY='your_api_key'")
        sys.exit(1)

    output_dir = os.path.join(os.path.dirname(__file__), 'public', 'data')
    os.makedirs(output_dir, exist_ok=True)

    all_data = {}
    for node_id, series_id in SERIES_MAP.items():
        series_data = fetch_series_data(api_key, series_id)
        all_data[node_id] = series_data

    output_file = os.path.join(output_dir, 'fred_data.json')
    with open(output_file, 'w') as f:
        json.dump(all_data, f, indent=2)

    print(f"\nSuccessfully downloaded FRED data to {output_file}")

if __name__ == "__main__":
    main()

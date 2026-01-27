# Scripts

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## json_to_yaml.py

Converts controls JSON to YAML format.

```bash
# Convert and write
python3 json_to_yaml.py

# Preview without writing
python3 json_to_yaml.py --dry-run

# Verify files match
python3 json_to_yaml.py --verify-only
```

## controls.py

Converts `controls.md` to Excel checklist.

```bash
python3 controls.py
```

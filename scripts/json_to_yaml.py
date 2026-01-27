#!/usr/bin/env python3
"""
Convert controls JSON file to YAML format.

Usage:
    python3 json_to_yaml.py                 # Convert and write to file
    python3 json_to_yaml.py --dry-run       # Preview YAML output without writing
    python3 json_to_yaml.py --verify-only   # Verify existing files match
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml


class CustomDumper(yaml.SafeDumper):
    """Custom YAML dumper for better formatting."""


def str_representer(dumper: CustomDumper, data: str) -> yaml.Node:
    """Use literal block style for multiline strings, otherwise default."""
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


def none_representer(dumper: CustomDumper, data: None) -> yaml.Node:
    """Represent None as 'null' in YAML."""
    return dumper.represent_scalar("tag:yaml.org,2002:null", "null")


CustomDumper.add_representer(str, str_representer)
CustomDumper.add_representer(type(None), none_representer)


def json_to_yaml(json_path: Path) -> str:
    """Convert JSON file to YAML string."""
    data = json.loads(json_path.read_text(encoding="utf-8"))
    return yaml.dump(
        data,
        Dumper=CustomDumper,
        default_flow_style=False,
        allow_unicode=True,
        sort_keys=False,
        width=100,
        indent=2,
    )


def convert_json_to_yaml(json_path: Path, yaml_path: Path) -> None:
    """Convert JSON file to YAML and write to file."""
    yaml_content = json_to_yaml(json_path)
    yaml_path.write_text(yaml_content, encoding="utf-8")
    print(f"Converted {json_path} -> {yaml_path}")


def _normalize(data: Any) -> Any:
    """Normalize data by stripping trailing whitespace from strings."""
    if isinstance(data, str):
        return data.strip()
    if isinstance(data, dict):
        return {k: _normalize(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_normalize(item) for item in data]
    return data


def verify_conversion(json_path: Path, yaml_path: Path) -> bool:
    """Verify that JSON and YAML files contain equivalent data."""
    json_data = json.loads(json_path.read_text(encoding="utf-8"))
    yaml_data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))

    # Normalize both to handle YAML folded block scalar trailing newlines
    json_normalized = _normalize(json_data)
    yaml_normalized = _normalize(yaml_data)

    if json_normalized == yaml_normalized:
        print("Verification PASSED: JSON and YAML contain identical data")
        return True

    print("Verification FAILED: JSON and YAML data differ", file=sys.stderr)
    _compare_values(json_normalized, yaml_normalized, "root")
    return False


def _compare_values(val1: Any, val2: Any, path: str) -> None:
    """Recursively compare two values and print differences."""
    if type(val1) is not type(val2):
        print(
            f"  Type mismatch at {path}: {type(val1).__name__} vs {type(val2).__name__}",
            file=sys.stderr,
        )
        return

    if isinstance(val1, dict):
        keys1 = set(val1.keys())
        keys2 = set(val2.keys())

        for key in keys1 - keys2:
            print(f"  Missing in YAML at {path}: {key}", file=sys.stderr)
        for key in keys2 - keys1:
            print(f"  Extra in YAML at {path}: {key}", file=sys.stderr)

        for key in keys1 & keys2:
            _compare_values(val1[key], val2[key], f"{path}.{key}")

    elif isinstance(val1, list):
        if len(val1) != len(val2):
            print(
                f"  List length mismatch at {path}: {len(val1)} vs {len(val2)}",
                file=sys.stderr,
            )
        for i, (item1, item2) in enumerate(zip(val1, val2)):
            _compare_values(item1, item2, f"{path}[{i}]")

    elif val1 != val2:
        print(f"  Value mismatch at {path}: {val1!r} vs {val2!r}", file=sys.stderr)


def main() -> None:
    """Main entry point."""
    repo_root = Path(__file__).parent.parent.resolve()
    default_input = repo_root / "controls" / "dhis2-certification-v1.json"
    default_output = repo_root / "controls" / "dhis2-certification-v1.yml"

    parser = argparse.ArgumentParser(description="Convert controls JSON to YAML format.")
    parser.add_argument("--input", "-i", type=Path, default=default_input, help="Input JSON file")
    parser.add_argument("--output", "-o", type=Path, default=default_output, help="Output YAML file")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Preview YAML output without writing")
    parser.add_argument("--verify-only", "-v", action="store_true", help="Only verify existing files match")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print(json_to_yaml(args.input))
        sys.exit(0)

    if args.verify_only:
        if not args.output.exists():
            print(f"Error: Output file not found: {args.output}", file=sys.stderr)
            sys.exit(1)
        success = verify_conversion(args.input, args.output)
        sys.exit(0 if success else 1)

    convert_json_to_yaml(args.input, args.output)

    success = verify_conversion(args.input, args.output)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

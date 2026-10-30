"""Unit tests that never touch a database.

Kept outside tests/ on purpose: tests/conftest.py connects to Postgres at
import time, runs create_all, and truncates every table after each test.
Nothing here needs that. Run with:  python -m pytest tests_unit
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

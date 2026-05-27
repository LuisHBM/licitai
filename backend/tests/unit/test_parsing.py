from datetime import date, datetime
from decimal import Decimal

import pytest

from crawler.schemas import _to_date, _to_datetime, _to_decimal


@pytest.mark.unit
class TestParseDate:
    def test_iso_date(self):
        assert _to_date("2025-01-15") == date(2025, 1, 15)

    def test_datetime_string_truncated(self):
        assert _to_date("2025-01-15T09:00:00") == date(2025, 1, 15)

    def test_none_returns_none(self):
        assert _to_date(None) is None

    def test_empty_string_returns_none(self):
        assert _to_date("") is None

    def test_invalid_returns_none(self):
        assert _to_date("not-a-date") is None


@pytest.mark.unit
class TestParseDt:
    def test_iso_datetime(self):
        assert _to_datetime("2025-01-15T09:30:00") == datetime(2025, 1, 15, 9, 30, 0)

    def test_strips_timezone(self):
        assert _to_datetime("2025-01-15T09:30:00-03:00") == datetime(2025, 1, 15, 9, 30, 0)

    def test_none_returns_none(self):
        assert _to_datetime(None) is None

    def test_empty_string_returns_none(self):
        assert _to_datetime("") is None

    def test_invalid_returns_none(self):
        assert _to_datetime("garbage") is None


@pytest.mark.unit
class TestParseDecimal:
    def test_float(self):
        assert _to_decimal(50000.50) == Decimal("50000.5")

    def test_string(self):
        assert _to_decimal("1234.56") == Decimal("1234.56")

    def test_zero(self):
        assert _to_decimal(0) == Decimal("0")

    def test_none_returns_none(self):
        assert _to_decimal(None) is None

    def test_invalid_returns_none(self):
        assert _to_decimal("abc") is None

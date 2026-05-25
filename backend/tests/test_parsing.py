from datetime import date, datetime
from decimal import Decimal

from crawler.etl import _parse_date, _parse_decimal, _parse_dt


class TestParseDate:
    def test_iso_date(self):
        assert _parse_date("2025-01-15") == date(2025, 1, 15)

    def test_datetime_string_truncated(self):
        assert _parse_date("2025-01-15T09:00:00") == date(2025, 1, 15)

    def test_none_returns_none(self):
        assert _parse_date(None) is None

    def test_empty_string_returns_none(self):
        assert _parse_date("") is None

    def test_invalid_returns_none(self):
        assert _parse_date("not-a-date") is None


class TestParseDt:
    def test_iso_datetime(self):
        assert _parse_dt("2025-01-15T09:30:00") == datetime(2025, 1, 15, 9, 30, 0)

    def test_strips_timezone(self):
        assert _parse_dt("2025-01-15T09:30:00-03:00") == datetime(2025, 1, 15, 9, 30, 0)

    def test_none_returns_none(self):
        assert _parse_dt(None) is None

    def test_empty_string_returns_none(self):
        assert _parse_dt("") is None

    def test_invalid_returns_none(self):
        assert _parse_dt("garbage") is None


class TestParseDecimal:
    def test_float(self):
        assert _parse_decimal(50000.50) == Decimal("50000.5")

    def test_string(self):
        assert _parse_decimal("1234.56") == Decimal("1234.56")

    def test_zero(self):
        assert _parse_decimal(0) == Decimal("0")

    def test_none_returns_none(self):
        assert _parse_decimal(None) is None

    def test_invalid_returns_none(self):
        assert _parse_decimal("abc") is None

import unittest
import base64
import json
import hashlib
from unittest.mock import patch, AsyncMock
from services.payment.phonepe import (
    calculate_sha256,
    generate_checksum,
    verify_checksum,
    PhonePeService,
    ASTRA_PASS_AMOUNT_PAISE,
    PHONEPE_SALT_KEY,
    PHONEPE_SALT_INDEX,
)


class TestPhonePePayment(unittest.TestCase):
    """Automated tests for PhonePe Standard Payment Gateway Integration."""

    def test_sha256_calculation(self):
        sample = "hello_astra"
        expected = hashlib.sha256(sample.encode("utf-8")).hexdigest()
        self.assertEqual(calculate_sha256(sample), expected)

    def test_generate_checksum_format(self):
        payload_b64 = base64.b64encode(b'{"test": 123}').decode("utf-8")
        endpoint = "/pg/v1/pay"
        checksum = generate_checksum(payload_b64, endpoint)

        self.assertIn("###", checksum)
        parts = checksum.split("###")
        self.assertEqual(len(parts), 2)
        self.assertEqual(parts[1], PHONEPE_SALT_INDEX)

        expected_hash = hashlib.sha256(
            f"{payload_b64}{endpoint}{PHONEPE_SALT_KEY}".encode("utf-8")
        ).hexdigest()
        self.assertEqual(parts[0], expected_hash)

    def test_verify_checksum_valid_and_invalid(self):
        response_data = '{"code": "PAYMENT_SUCCESS", "data": {"amount": 9900}}'
        response_b64 = base64.b64encode(response_data.encode("utf-8")).decode("utf-8")

        valid_hash = hashlib.sha256(f"{response_b64}{PHONEPE_SALT_KEY}".encode("utf-8")).hexdigest()
        valid_header = f"{valid_hash}###{PHONEPE_SALT_INDEX}"

        # Valid header must pass
        self.assertTrue(verify_checksum(response_b64, valid_header))

        # Tampered response payload must fail
        tampered_b64 = base64.b64encode(b'{"tampered": true}').decode("utf-8")
        self.assertFalse(verify_checksum(tampered_b64, valid_header))

        # Tampered salt key / forged header must fail
        forged_header = f"fakehash123###{PHONEPE_SALT_INDEX}"
        self.assertFalse(verify_checksum(response_b64, forged_header))

        # Empty or malformed header must fail
        self.assertFalse(verify_checksum(response_b64, ""))
        self.assertFalse(verify_checksum(response_b64, "no_delimiter_hash"))

    def test_pass_pricing_amount(self):
        # 9900 paise = ₹99
        self.assertEqual(ASTRA_PASS_AMOUNT_PAISE, 9900)


if __name__ == "__main__":
    unittest.main()

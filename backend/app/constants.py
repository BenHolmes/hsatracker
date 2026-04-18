from enum import Enum


class HsaCategory(str, Enum):
    DOCTORS_VISITS = "doctors_visits"
    PRESCRIPTION_DRUGS = "prescription_drugs"
    DENTAL_CARE = "dental_care"
    VISION_CARE = "vision_care"
    MENTAL_HEALTH = "mental_health"
    PHYSICAL_THERAPY = "physical_therapy"
    CHIROPRACTIC = "chiropractic"
    ACUPUNCTURE = "acupuncture"
    HOSPITAL_SERVICES = "hospital_services"
    SURGERY = "surgery"
    LAB_TESTS = "lab_tests"
    MEDICAL_EQUIPMENT = "medical_equipment"
    HEARING_AIDS = "hearing_aids"
    MENSTRUAL_PRODUCTS = "menstrual_products"
    BIRTH_CONTROL = "birth_control"
    FERTILITY_TREATMENT = "fertility_treatment"
    SMOKING_CESSATION = "smoking_cessation"
    WEIGHT_LOSS_PROGRAM = "weight_loss_program"
    LONG_TERM_CARE = "long_term_care"
    TRANSPORTATION = "transportation"
    INSURANCE_PREMIUMS = "insurance_premiums"
    OTHER_ELIGIBLE = "other_eligible"


class PaymentMethod(str, Enum):
    OUT_OF_POCKET = "out_of_pocket"
    HSA = "hsa"


class ReimbursementStatus(str, Enum):
    PENDING = "pending"
    REIMBURSED = "reimbursed"


class ContributionSource(str, Enum):
    SELF = "self"
    EMPLOYER = "employer"
    OTHER = "other"


class CoverageType(str, Enum):
    INDIVIDUAL = "individual"
    FAMILY = "family"


class ThemeChoice(str, Enum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


# IRS HSA contribution limits by tax year: (individual, family)
# Source: https://dqydj.com/historical-hsa-contribution-limit/
# TODO: add minimum deductible required and catch-up contribution amounts (+$1,000 for age 55+)
CONTRIBUTION_LIMITS: dict[int, tuple[str, str]] = {
    2004: ("2600.00", "5150.00"),
    2005: ("2650.00", "5250.00"),
    2006: ("2700.00", "5450.00"),
    2007: ("2850.00", "5650.00"),
    2008: ("2900.00", "5800.00"),
    2009: ("3000.00", "5950.00"),
    2010: ("3050.00", "6150.00"),
    2011: ("3050.00", "6150.00"),
    2012: ("3100.00", "6250.00"),
    2013: ("3250.00", "6450.00"),
    2014: ("3300.00", "6550.00"),
    2015: ("3350.00", "6650.00"),
    2016: ("3350.00", "6750.00"),
    2017: ("3400.00", "6750.00"),
    2018: ("3450.00", "6900.00"),
    2019: ("3500.00", "7000.00"),
    2020: ("3550.00", "7100.00"),
    2021: ("3600.00", "7200.00"),
    2022: ("3650.00", "7300.00"),
    2023: ("3850.00", "7750.00"),
    2024: ("4150.00", "8300.00"),
    2025: ("4300.00", "8550.00"),
    2026: ("4400.00", "8750.00"),
}

ALLOWED_RECEIPT_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}

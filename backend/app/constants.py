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


# IRS HSA contribution limits by tax year: (individual, family)
CONTRIBUTION_LIMITS: dict[int, tuple[float, float]] = {
    2024: (4150.00, 8300.00),
    2025: (4300.00, 8550.00),
    2026: (4300.00, 8550.00),
}

ALLOWED_RECEIPT_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}

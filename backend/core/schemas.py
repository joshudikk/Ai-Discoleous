from typing import Literal

from pydantic import BaseModel, Field

DocType = Literal["makalah", "esai", "kti"]


class SuggestTitlesRequest(BaseModel):
    jurusan: str = Field(min_length=2, max_length=120)
    doc_type: DocType = "makalah"
    keyword: str = Field(default="", max_length=200)


class SuggestTitlesResponse(BaseModel):
    titles: list[str]
    model: str


class GenerateRequest(BaseModel):
    doc_type: DocType
    title: str = Field(min_length=4, max_length=300)
    jurusan: str = Field(default="", max_length=120)
    catatan: str = Field(default="", max_length=1000)
    panjang: Literal["ringkas", "standar", "lengkap"] = "standar"
    # Pendekatan/metode penelitian. "tidak" = tanpa metode (mis. untuk esai).
    metode: Literal["kualitatif", "kuantitatif", "campuran", "tidak"] = "tidak"
    # Rentang tahun sumber daftar pustaka.
    pustaka: Literal["5", "10", "bebas"] = "bebas"
    # Mesin AI: "gemini" = Thunder Mode (default), "athena" = Athena Mode (premium).
    engine: Literal["gemini", "athena"] = "gemini"


class MeResponse(BaseModel):
    uid: str
    nama: str
    tier: str
    role: str
    statusSubscription: str
    canSuggestTitles: bool
    model: str


class ClaimPaymentRequest(BaseModel):
    packageTier: Literal["faozonica", "sharnikas", "dikthought"]
    promoCode: str = Field(default="", max_length=32)


class PromoCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    discountPercent: int = Field(ge=1, le=100)


class PromoCheckRequest(BaseModel):
    code: str = Field(min_length=1, max_length=32)


class RedeemTokenRequest(BaseModel):
    token: str = Field(min_length=4, max_length=32)


class PaymentStatusResponse(BaseModel):
    status: str
    tier: str


class AthenaGrantRequest(BaseModel):
    count: int = Field(default=1, ge=1, le=100)

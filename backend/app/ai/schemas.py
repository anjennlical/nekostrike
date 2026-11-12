from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

Text = Annotated[str, Field(min_length=1, max_length=1800)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class AnalyzeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    finding_id: UUID


class EvidenceReference(StrictModel):
    evidence_id: str = Field(min_length=1, max_length=100)
    path: str = Field(min_length=1, max_length=100)
    actor: str = Field(min_length=1, max_length=30)
    status: int = Field(ge=100, le=599)


class Analysis(StrictModel):
    finding_id: str = Field(min_length=36, max_length=36)
    summary: Text
    technical_explanation: Text
    potential_impact: Text
    evidence_used: list[EvidenceReference] = Field(min_length=3, max_length=3)
    recommendations: list[Text] = Field(min_length=1, max_length=6)
    limitations: list[Text] = Field(min_length=1, max_length=6)


class AnalysisResult(StrictModel):
    analysis: Analysis
    provider: Literal["openai", "test_double"]
    model: str
    cached: bool
    requires_human_review: Literal[True] = True
    # These fields are supplied by the server, NEVER by the model.
    deterministic_verdict: Literal["vulnerable"]
    deterministic_severity: Literal["high", "medium"]


class AIStatus(StrictModel):
    status: Literal["disabled", "missing_key", "missing_model", "invalid_config", "configured"]
    provider: Literal["openai"] = "openai"
    model: str | None
    requests_remaining: int
    max_output_tokens: int
    timeout_seconds: int
    provider_verified: Literal[False] = False

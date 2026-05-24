"""
Maps URL topics (node names, free text) and optional domain hints to canonical
quiz banks and prompt scopes so questions match the selected learning track.
"""
from __future__ import annotations

from typing import Optional, Tuple

# Canonical keys must match QUESTION_BANK keys in question_generator.py (or General fallback).
CANONICAL_DOMAINS = frozenset(
    {
        "Machine Learning",
        "Web Development",
        "DSA",
        "Python",
        "Cloud & DevOps",
        "Data Engineering",
        "AI & LLMs",
        "Cybersecurity",
        "System Design",
        "TypeScript",
        "General",
    }
)

# Skill / track name (as shown in UI) -> canonical domain for content + bank lookup
SKILL_NAME_TO_DOMAIN: dict[str, str] = {
    "Machine Learning": "Machine Learning",
    "Web Development": "Web Development",
    "DSA": "DSA",
    "Python": "Python",
    "Cloud & DevOps": "Cloud & DevOps",
    "Data Engineering": "Data Engineering",
    "AI & LLMs": "AI & LLMs",
    "Cybersecurity": "Cybersecurity",
    "System Design": "System Design",
    "TypeScript": "TypeScript",
}

# Subtopic (node name or keyword) -> parent domain when domain hint is missing
_SUBTOPIC_KEYWORDS: list[tuple[str, str]] = [
    # Machine Learning
    ("supervised", "Machine Learning"),
    ("unsupervised", "Machine Learning"),
    ("ensemble", "Machine Learning"),
    ("xgboost", "Machine Learning"),
    ("random forest", "Machine Learning"),
    ("feature", "Machine Learning"),
    ("evaluation", "Machine Learning"),
    ("model", "Machine Learning"),
    ("ml fundamentals", "Machine Learning"),
    ("neural", "Machine Learning"),
    # Web
    ("html", "Web Development"),
    ("css", "Web Development"),
    ("javascript", "Web Development"),
    ("react", "Web Development"),
    ("api", "Web Development"),
    ("database", "Web Development"),
    ("full-stack", "Web Development"),
    # DSA
    ("array", "DSA"),
    ("linked list", "DSA"),
    ("stack", "DSA"),
    ("queue", "DSA"),
    ("tree", "DSA"),
    ("graph", "DSA"),
    ("dynamic programming", "DSA"),
    ("sort", "DSA"),
    ("algorithm", "DSA"),
    # Python
    ("python", "Python"),
    ("oop", "Python"),
    ("comprehension", "Python"),
    # Cloud & DevOps
    ("docker", "Cloud & DevOps"),
    ("kubernetes", "Cloud & DevOps"),
    ("k8s", "Cloud & DevOps"),
    ("ci/cd", "Cloud & DevOps"),
    ("terraform", "Cloud & DevOps"),
    ("aws", "Cloud & DevOps"),
    ("devops", "Cloud & DevOps"),
    ("container", "Cloud & DevOps"),
    # Data Engineering
    ("etl", "Data Engineering"),
    ("warehouse", "Data Engineering"),
    ("pipeline", "Data Engineering"),
    ("spark", "Data Engineering"),
    ("streaming", "Data Engineering"),
    ("sql", "Data Engineering"),
    # AI & LLMs
    ("llm", "AI & LLMs"),
    ("rag", "AI & LLMs"),
    ("embedding", "AI & LLMs"),
    ("prompt", "AI & LLMs"),
    ("guardrail", "AI & LLMs"),
    ("fine-tun", "AI & LLMs"),
    # Cybersecurity
    ("owasp", "Cybersecurity"),
    ("oauth", "Cybersecurity"),
    ("tls", "Cybersecurity"),
    ("crypto", "Cybersecurity"),
    ("threat", "Cybersecurity"),
    ("xss", "Cybersecurity"),
    ("injection", "Cybersecurity"),
    # System Design
    ("scalab", "System Design"),
    ("load balanc", "System Design"),
    ("cache", "System Design"),
    ("microservice", "System Design"),
    ("cdn", "System Design"),
    ("partition", "System Design"),
    # TypeScript
    ("typescript", "TypeScript"),
    ("generic", "TypeScript"),
    ("tsconfig", "TypeScript"),
]


def normalize_hint(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    s = s.strip()
    if not s:
        return None
    # Decode common URL forms
    if s in SKILL_NAME_TO_DOMAIN:
        return SKILL_NAME_TO_DOMAIN[s]
    if s in CANONICAL_DOMAINS:
        return s
    return s


def infer_domain_from_topic(topic: str) -> str:
    """Best-effort domain from path segment (often a skill node name)."""
    t = topic.lower().strip()
    for needle, domain in _SUBTOPIC_KEYWORDS:
        if needle in t:
            return domain
    # Title-case match against skill names
    for name, domain in SKILL_NAME_TO_DOMAIN.items():
        if name.lower() in t or t in name.lower():
            return domain
    return "General"


def resolve_quiz_domain(
    topic: str,
    domain_hint: Optional[str] = None,
) -> Tuple[str, str]:
    """
    Returns (canonical_domain, focus_label_for_prompt).

    canonical_domain: key for question bank + analytics.
    focus_label: subtopic shown to the LLM (node name or topic string).
    """
    focus = topic.strip() or "General"
    hint = normalize_hint(domain_hint)

    if hint and hint in CANONICAL_DOMAINS:
        canonical = hint
    elif hint and hint in SKILL_NAME_TO_DOMAIN.values():
        canonical = hint
    elif hint:
        # Unknown hint: still use infer + prefer hint as extra focus
        canonical = infer_domain_from_topic(topic)
        if canonical == "General" and hint:
            focus = f"{hint}: {focus}"
    else:
        canonical = infer_domain_from_topic(topic)

    if canonical == "General" and focus:
        # Last resort: try inferring from focus string alone
        canonical = infer_domain_from_topic(focus)

    return canonical, focus


def domain_scope_blurb(canonical_domain: str, focus: str) -> str:
    """Short instruction block for LLM prompts (human-sounding, specific)."""
    scopes = {
        "Machine Learning": (
            "Stay within practical ML: models, training, evaluation, and common algorithms. "
            "No trivia about company names."
        ),
        "Web Development": (
            "Cover HTML semantics, CSS layout, JavaScript behavior, HTTP, and front-end patterns. "
            "Avoid buzzwords without technical substance."
        ),
        "DSA": (
            "Use classic interview-style DSA: complexity, structures, and well-known algorithms. "
            "One clear correct answer among four plausible distractors."
        ),
        "Python": (
            "Python language mechanics: syntax, data structures, functions, and idioms. "
            "Keep distractors realistic for someone who has written real code."
        ),
        "Cloud & DevOps": (
            "Cover cloud primitives, containers, CI/CD, and operations—concrete commands and tradeoffs, "
            "not vendor marketing."
        ),
        "Data Engineering": (
            "Focus on SQL, pipelines, warehousing, and data quality—what breaks in production and how you test it."
        ),
        "AI & LLMs": (
            "Stay on LLM applications: prompting, retrieval, evaluation, and safety—not generic AI hype."
        ),
        "Cybersecurity": (
            "Use AppSec and systems security basics: threats, mitigations, and how controls fail in practice."
        ),
        "System Design": (
            "Interview-style system design: APIs, storage, scaling, reliability—justify tradeoffs with numbers."
        ),
        "TypeScript": (
            "TypeScript and typed JS patterns: types, tooling, async, and framework usage—real compiler behavior."
        ),
        "General": "Keep the question concrete and unambiguous.",
    }
    base = scopes.get(canonical_domain, scopes["General"])
    return (
        f"Domain: {canonical_domain}. Subtopic / focus: {focus}. "
        f"{base}"
    )

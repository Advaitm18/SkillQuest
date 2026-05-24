"""
NLP Answer Evaluator using TF-IDF + Cosine Similarity.

For MCQ questions, exact match is used.
For open-ended text questions, TF-IDF vectors are compared
using cosine similarity to produce a partial-credit score.
"""
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _normalize(text: str) -> str:
    """Lowercase, strip punctuation and extra whitespace."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def evaluate_mcq(user_answer: str, correct_answer: str) -> float:
    """Exact match for MCQ — returns 1.0 or 0.0."""
    return 1.0 if _normalize(user_answer) == _normalize(correct_answer) else 0.0


def evaluate_text_answer(user_answer: str, correct_answer: str) -> float:
    """
    Evaluate a free-text answer using TF-IDF cosine similarity.

    The vectorizer is fit on both texts together so term frequencies
    are computed in the context of both documents.  Returns a score
    in [0.0, 1.0]; scores above 0.5 are considered correct.
    """
    if not user_answer or not user_answer.strip():
        return 0.0

    norm_user = _normalize(user_answer)
    norm_correct = _normalize(correct_answer)

    # Short-circuit: if texts are identical
    if norm_user == norm_correct:
        return 1.0

    try:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),   # unigrams + bigrams for richer matching
            stop_words="english",
            min_df=1,
        )
        # Fit on both documents to build shared vocabulary
        tfidf_matrix = vectorizer.fit_transform([norm_user, norm_correct])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(round(similarity, 4))
    except Exception:
        # Fallback: character n-gram overlap
        user_tokens = set(norm_user.split())
        correct_tokens = set(norm_correct.split())
        if not correct_tokens:
            return 0.0
        overlap = len(user_tokens & correct_tokens) / len(correct_tokens)
        return float(round(overlap, 4))


def evaluate_answer(
    user_answer: str,
    correct_answer: str,
    question_type: str = "mcq",
) -> tuple[float, bool]:
    """
    Main evaluation function.

    Returns:
        (score: float, is_correct: bool)
        - MCQ: score is 0.0 or 1.0
        - Text: score is cosine similarity; is_correct if score >= 0.55
    """
    if question_type == "mcq":
        score = evaluate_mcq(user_answer, correct_answer)
        return score, score == 1.0
    else:
        score = evaluate_text_answer(user_answer, correct_answer)
        is_correct = score >= 0.55
        return score, is_correct

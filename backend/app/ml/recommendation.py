"""
Content-Based Recommendation Engine.

Suggests the next topics/skills based on:
  1. User's completed topics (avoid repetition)
  2. User's weak topics (remediation)
  3. Topic similarity via TF-IDF on topic descriptions
  4. Logical learning progression (prerequisites first)

Returns a ranked list of recommended topics/skill nodes.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Optional


# Topic metadata: descriptions used for content-based similarity
TOPIC_METADATA = {
    "Machine Learning": {
        "description": "supervised learning classification regression neural networks",
        "prerequisites": [],
        "category": "AI/ML",
    },
    "Deep Learning": {
        "description": "neural networks backpropagation CNN RNN transformers",
        "prerequisites": ["Machine Learning"],
        "category": "AI/ML",
    },
    "Python": {
        "description": "programming syntax functions classes data structures",
        "prerequisites": [],
        "category": "Programming",
    },
    "Web Development": {
        "description": "HTML CSS JavaScript React frontend backend APIs",
        "prerequisites": ["Python"],
        "category": "Web",
    },
    "DSA": {
        "description": "arrays trees graphs sorting searching algorithms complexity",
        "prerequisites": ["Python"],
        "category": "CS Fundamentals",
    },
    "Statistics": {
        "description": "probability distributions hypothesis testing regression correlation",
        "prerequisites": [],
        "category": "Mathematics",
    },
    "SQL": {
        "description": "databases queries joins aggregation normalization indexes",
        "prerequisites": [],
        "category": "Data",
    },
    "System Design": {
        "description": "scalability microservices caching load balancing distributed systems",
        "prerequisites": ["Web Development", "DSA"],
        "category": "Architecture",
    },
    "Cloud & DevOps": {
        "description": "AWS containers kubernetes docker terraform CI CD pipelines infrastructure",
        "prerequisites": [],
        "category": "Cloud",
    },
    "Data Engineering": {
        "description": "ETL pipelines warehousing streaming Spark SQL data quality lineage",
        "prerequisites": ["SQL"],
        "category": "Data",
    },
    "AI & LLMs": {
        "description": "prompting RAG embeddings evaluation guardrails fine tuning LLM applications",
        "prerequisites": ["Machine Learning"],
        "category": "AI/ML",
    },
    "Cybersecurity": {
        "description": "OWASP authentication TLS cryptography threat modeling secure development",
        "prerequisites": ["Web Development"],
        "category": "Security",
    },
    "TypeScript": {
        "description": "typed JavaScript generics React tooling async modules tsconfig",
        "prerequisites": ["Web Development"],
        "category": "Programming",
    },
}


class RecommendationEngine:
    """
    Content-based filtering recommendation engine.

    Builds a TF-IDF similarity matrix across all topic descriptions
    and uses it to find topics that are semantically close to what
    the user has been studying, while factoring in performance gaps.
    """

    def __init__(self):
        self._topic_names = list(TOPIC_METADATA.keys())
        self._descriptions = [TOPIC_METADATA[t]["description"] for t in self._topic_names]
        self._vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        self._tfidf_matrix = self._vectorizer.fit_transform(self._descriptions)
        # Precompute cosine similarity matrix (N×N)
        self._sim_matrix = cosine_similarity(self._tfidf_matrix)

    def _topic_index(self, topic: str) -> Optional[int]:
        try:
            return self._topic_names.index(topic)
        except ValueError:
            return None

    def get_similar_topics(self, topic: str, top_k: int = 3) -> List[str]:
        """Return top_k topics most similar to the given topic."""
        idx = self._topic_index(topic)
        if idx is None:
            return []
        scores = list(enumerate(self._sim_matrix[idx]))
        scores.sort(key=lambda x: x[1], reverse=True)
        # Exclude the topic itself
        return [self._topic_names[i] for i, _ in scores[1 : top_k + 1]]

    def recommend(
        self,
        completed_topics: List[str],
        weak_topics: List[str],
        current_topic: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict]:
        """
        Generate ranked topic recommendations.

        Priority order:
          1. Weak topics the user has started (needs remediation)
          2. Topics similar to current/recent topic
          3. Topics that have prerequisites met
          4. New topics not yet attempted
        """
        recommendations = {}
        completed_set = set(completed_topics)

        # Priority 1: Weak topics → boost their score significantly
        for topic in weak_topics:
            if topic in TOPIC_METADATA:
                recommendations[topic] = recommendations.get(topic, 0) + 10

        # Priority 2: Similar to current topic
        if current_topic:
            similar = self.get_similar_topics(current_topic, top_k=4)
            for i, t in enumerate(similar):
                if t not in completed_set:
                    recommendations[t] = recommendations.get(t, 0) + (4 - i)

        # Priority 3: Prerequisites met
        for topic, meta in TOPIC_METADATA.items():
            if topic in completed_set:
                continue
            prereqs = meta.get("prerequisites", [])
            if all(p in completed_set for p in prereqs):
                recommendations[topic] = recommendations.get(topic, 0) + 2

        # Priority 4: All unvisited topics get a base score
        for topic in TOPIC_METADATA:
            if topic not in completed_set and topic not in recommendations:
                recommendations[topic] = 1

        # Sort and return top_k
        sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        return [
            {
                "topic": t,
                "score": s,
                "reason": (
                    "Needs practice" if t in weak_topics
                    else "Similar to recent study" if current_topic and t in self.get_similar_topics(current_topic)
                    else "Ready to learn"
                ),
                "category": TOPIC_METADATA.get(t, {}).get("category", "General"),
            }
            for t, s in sorted_recs[:top_k]
        ]


# Singleton instance — initialized once at module load
recommendation_engine = RecommendationEngine()

# QUERY FLOW WITH NOMIC EMBEDDINGS - VISUAL GUIDE

## How Your Query System Works (Line by Line)

```
┌────────────────────────────────────────────────────────────────────────┐
│                    YOUR CCTV QUERYING SYSTEM                           │
└────────────────────────────────────────────────────────────────────────┘

USER TYPES: "Show me suspicious activity at night"
     │
     ├──────────────────────────────────────────────────────────────────┐
     │                                                                   │
     ▼                                                                   │
┌─────────────────────┐                                                 │
│   app.py Line 76    │  embeddings = OllamaEmbeddings("nomic-embed")  │
│  NOMIC EMBEDDING    │                                                 │
└──────────┬──────────┘                                                 │
           │                                                             │
           ▼                                                             │
   Query Vector (768 numbers)                                           │
   [0.234, -0.891, 0.456, ..., 0.789]                                  │
           │                                                             │
           ├─────────────────────────────────────────┐                  │
           │                                          │                  │
           ▼                                          │                  │
┌──────────────────────────┐                         │                  │
│   app.py Line 83-88      │                         │                  │
│   CHROMADB CONNECTION    │                         │                  │
│                          │                         │                  │
│ vector_store = Chroma(   │                         │                  │
│   embedding_function=    │                         │                  │
│     embeddings,          │ ◄────USES SAME──────────┘                  │
│   collection_name=       │     NOMIC MODEL                            │
│     "documents"          │                                            │
│ )                        │                                            │
└──────────┬───────────────┘                                            │
           │                                                             │
           ▼                                                             │
┌──────────────────────────────────────────────────────┐               │
│   app.py Line 93: Configure Retriever                │               │
│                                                       │               │
│   retriever = vector_store.as_retriever(             │               │
│       search_type="similarity",                      │               │
│       search_kwargs={"k": 15}  # Top 15 results     │               │
│   )                                                   │               │
└──────────┬────────────────────────────────────────────┘              │
           │                                                             │
           ▼                                                             │
┌──────────────────────────────────────────────────────────────────────┐
│   app.py Line 94: EXECUTE THE QUERY (THE MAGIC LINE!)               │
│                                                                       │
│   relevant_docs = retriever.invoke(query)                           │
│                                                                       │
│   What happens behind the scenes:                                    │
│   ┌───────────────────────────────────────────────────────┐        │
│   │ 1. Query text → Nomic embedding → Query Vector       │        │
│   │                                                        │        │
│   │ 2. ChromaDB has stored vectors for ALL captions:      │        │
│   │    Caption 1: [0.12, -0.44, ...]  (768 dims)         │        │
│   │    Caption 2: [0.89, 0.23, ...]   (768 dims)         │        │
│   │    Caption 3: [-0.56, 0.78, ...]  (768 dims)         │        │
│   │    ... (thousands more)                               │        │
│   │                                                        │        │
│   │ 3. Calculate COSINE SIMILARITY for each:             │        │
│   │                                                        │        │
│   │    similarity = (Q · C) / (||Q|| × ||C||)            │        │
│   │                                                        │        │
│   │    Where:                                             │        │
│   │    • Q = Query vector                                 │        │
│   │    • C = Caption vector                               │        │
│   │    • · = dot product                                  │        │
│   │    • || || = magnitude                                │        │
│   │                                                        │        │
│   │ 4. SCORES for our query:                             │        │
│   │    Caption 542: 0.87  ← "Person loitering at ATM"    │        │
│   │    Caption 109: 0.82  ← "Suspicious behavior at..."  │        │
│   │    Caption 891: 0.78  ← "Individual near ATM..."     │        │
│   │    Caption 234: 0.73  ← "Person acting nervous..."   │        │
│   │    Caption 667: 0.70  ← "Someone waiting alone..."   │        │
│   │    Caption 445: 0.68  ...                             │        │
│   │    ... (continues for all captions)                   │        │
│   │                                                        │        │
│   │ 5. Sort by score (highest first)                     │        │
│   │                                                        │        │
│   │ 6. Return top 15 matches                             │        │
│   └───────────────────────────────────────────────────────┘        │
└──────────┬────────────────────────────────────────────────────────────┘
           │
           ▼
   TOP 15 MOST RELEVANT CAPTIONS
           │
           │  Example:
           │  1. "Timestamp: [22:30:15] || ATM || Person loitering..."
           │  2. "Timestamp: [22:30:20] || ATM || Suspicious behavior..."
           │  3. "Timestamp: [22:31:00] || ATM || Individual waiting..."
           │  ... (12 more)
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│   app.py Line 95: BUILD CONTEXT                                      │
│                                                                       │
│   context = "\n".join([doc.page_content for doc in relevant_docs])  │
│                                                                       │
│   Combines all 15 captions into one big text block                   │
└──────────┬────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│   app.py Lines 97-113: PREPARE LLM PROMPT                           │
│                                                                       │
│   system_prompt = "You are a CCTV analysis assistant..."            │
│   human_prompt = f"Context:\n{context}\n\nQuestion: {query}"         │
│                                                                       │
│   What the LLM sees:                                                 │
│   ┌──────────────────────────────────────────────────────┐          │
│   │ Context:                                              │          │
│   │ Timestamp: [22:30:15] || ATM || Person loitering...  │          │
│   │ Timestamp: [22:30:20] || ATM || Suspicious behavior..│          │
│   │ ... (13 more captions)                               │          │
│   │                                                       │          │
│   │ Question: Show me suspicious activity at night       │          │
│   └──────────────────────────────────────────────────────┘          │
└──────────┬────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│   app.py Lines 117-140: CALL NVIDIA GEMMA 3 27B                     │
│                                                                       │
│   response = requests.post(NVIDIA_INVOKE_URL, json=payload)         │
│                                                                       │
│   LLM reads the context and generates human answer                   │
└──────────┬────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│   FINAL ANSWER TO USER                                               │
│                                                                       │
│   "Suspicious activity detected at [22:30:15] in the ATM Lobby.     │
│   A person wearing dark clothing was observed loitering near the     │
│   ATM machine, exhibiting nervous behavior and repeatedly looking    │
│   around. The individual remained in the area for approximately      │
│   45 seconds before leaving."                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Insight: Why Nomic is Essential

**WITHOUT embeddings:**
- Query: "suspicious person"
- Only matches captions with exact words "suspicious" AND "person"
- Misses: "loitering individual", "nervous behavior", "acting strange"

**WITH Nomic embeddings:**
- Query: "suspicious person" → Vector [0.23, -0.89, ...]
- Matches ANY caption with similar MEANING:
  - "loitering individual" → 0.85 similarity ✓
  - "person acting nervous" → 0.82 similarity ✓
  - "someone behaving oddly" → 0.78 similarity ✓

**Nomic understands semantics, not just keywords!**

---

## The Math (Simplified)

```
Cosine Similarity Visualization:

      Caption Vector B
            ↑
           /│
          / │
         /  │ θ = 25° (small angle)
        /   │
       /    │
      /─────┴──────→ Query Vector A
     
    cos(25°) = 0.91  (HIGH similarity)


      Caption Vector C
         ↑
         │
         │
         │ θ = 60° (medium angle)
         │    /
         │   /
         │  /
         │ /
         │/
         └──────→ Query Vector A
     
    cos(60°) = 0.50  (MEDIUM similarity)


      Caption Vector D
         ↑
         │
         │ θ = 85° (large angle)
         │
         │    Query Vector A
         │   ───────→
         │
     
    cos(85°) = 0.09  (LOW similarity)
```

**Formula:**
```
similarity = cos(θ) = (A · B) / (||A|| × ||B||)

Where:
• A·B = sum of (A[i] × B[i]) for all 768 dimensions
• ||A|| = sqrt(sum of A[i]²)
• Result: 0.0 (perpendicular) to 1.0 (identical direction)
```

---

## Testing It Yourself

```bash
# 1. Run the demo
cd CCTV_Querying_System
python demo_query_flow.py

# 2. You'll see:
# - Query converted to 768-dim vector ✓
# - Similarity computed with sample captions ✓
# - Top matches ranked by relevance ✓
# - Complete flow simulation ✓
```

---

## Real Example from Your System

**Input:**
```
Query: "Find people entering the building"
```

**Processing:**
1. Nomic → `[0.123, -0.445, 0.778, ..., -0.234]` (768 dims)
2. ChromaDB compares with all caption vectors
3. Top matches:
   - "Person walking through main entrance" → 0.89
   - "Individual entering the building" → 0.87
   - "Someone going inside" → 0.83
   - "Employee arriving at work" → 0.76
   - "Delivery person at entrance" → 0.72

**Output:**
```
"Multiple entries detected:
• [08:30:15] Employee arriving through main entrance
• [09:15:40] Delivery person entering the building
• [10:45:22] Individual walking through entrance
..."
```

**The LLM can only answer based on what Nomic finds!**

---

## Summary

**Line 94 in app.py is THE critical line:**
```python
relevant_docs = retriever.invoke(query)
```

**This ONE line:**
1. Converts your query to a Nomic vector (768 numbers)
2. Compares with ALL caption vectors in ChromaDB
3. Uses cosine similarity to rank relevance
4. Returns top 15 most semantically similar captions
5. Enables natural language understanding

**Without Nomic:** Keyword search only
**With Nomic:** Semantic understanding!

That's how queries work with Nomic in your CCTV system! 🎯

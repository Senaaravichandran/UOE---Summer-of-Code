"""
HOW QUERIES WORK WITH NOMIC EMBEDDINGS IN YOUR CCTV SYSTEM
===========================================================

This script demonstrates the complete query flow step-by-step.
"""

# ============================================================================
# STEP-BY-STEP QUERY FLOW
# ============================================================================

"""
When you ask a query like: "Show me suspicious activity at night"

Here's what happens internally:
"""

# ============================================================================
# STEP 1: Query gets converted to embedding (vector)
# ============================================================================

from langchain_ollama import OllamaEmbeddings

# Your app.py does this:
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# User's natural language query
user_query = "Show me suspicious activity at night"

# Nomic converts it to a 768-dimensional vector
query_vector = embeddings.embed_query(user_query)

print("="*80)
print("STEP 1: QUERY → VECTOR")
print("="*80)
print(f"Original query: '{user_query}'")
print(f"Converted to: 768-dimensional vector (first 10 values shown)")
print(f"Vector: {query_vector[:10]}...")
print(f"Vector shape: {len(query_vector)} dimensions\n")


# ============================================================================
# STEP 2: ChromaDB finds similar caption vectors
# ============================================================================

"""
ChromaDB has stored vectors for ALL your CCTV captions.
It compares your query vector with ALL caption vectors using COSINE SIMILARITY.

Formula: similarity = (query_vector · caption_vector) / (||query|| * ||caption||)

Result: Score from 0.0 (completely different) to 1.0 (identical)
"""

print("="*80)
print("STEP 2: SIMILARITY SEARCH IN CHROMADB")
print("="*80)
print("ChromaDB compares query vector with ALL caption vectors")
print("\nExample similarity scores:")
print("  Caption: 'Person loitering near ATM at night'        → 0.87 (HIGH - very relevant!)")
print("  Caption: 'Individual walking through parking lot'    → 0.65 (MEDIUM)")
print("  Caption: 'Car parked during daytime'                 → 0.32 (LOW)")
print("  Caption: 'Bird flying over building'                 → 0.15 (VERY LOW)\n")

# Your app.py retrieves top 15 matches:
"""
retriever = vector_store.as_retriever(
    search_type="similarity", 
    search_kwargs={"k": 15}  # Get top 15 most similar
)
relevant_docs = retriever.invoke(query)
"""
print("Result: Top 15 most similar captions are retrieved\n")


# ============================================================================
# STEP 3: Retrieved captions become context
# ============================================================================

print("="*80)
print("STEP 3: BUILD CONTEXT FROM RETRIEVED CAPTIONS")
print("="*80)

example_retrieved_captions = [
    "Timestamp: [22:30:15] || Place: ATM_Lobby || Caption: Person wearing dark hoodie standing near ATM",
    "Timestamp: [22:30:18] || Place: ATM_Lobby || Caption: Same person repeatedly looking around nervously",
    "Timestamp: [22:30:25] || Place: ATM_Lobby || Caption: Person loitering in the area for extended period",
]

context = "\n".join(example_retrieved_captions)

print("Retrieved captions are combined into context:")
print("-" * 80)
print(context)
print("-" * 80 + "\n")


# ============================================================================
# STEP 4: Context + Query sent to NVIDIA Gemma LLM
# ============================================================================

print("="*80)
print("STEP 4: LLM GENERATES ANSWER FROM CONTEXT")
print("="*80)
print("\nThe LLM receives:")
print("  1. System prompt (instructions for law enforcement analysis)")
print("  2. Context (top 15 retrieved captions)")
print("  3. User's question")
print("\nLLM generates answer based ONLY on the context provided.")
print("It cannot 'see' the video - it only reads the captions!\n")


# ============================================================================
# VISUAL FLOW DIAGRAM
# ============================================================================

print("="*80)
print("COMPLETE QUERY FLOW")
print("="*80)
print("""
┌─────────────────────────────────────────────┐
│  USER TYPES QUERY                            │
│  "Show me suspicious activity at night"     │
└──────────────────┬──────────────────────────┘
                   ↓
         ┌─────────────────────┐
         │ Nomic Embedding     │  <-- Your app.py line 76
         │ (via Ollama)        │      embeddings.embed_query(query)
         └──────────┬──────────┘
                   ↓
         Query Vector (768 numbers)
         [0.234, -0.891, 0.456, ...]
                   ↓
    ┌──────────────────────────────────┐
    │ ChromaDB Similarity Search       │  <-- Your app.py line 93
    │                                  │      retriever.invoke(query)
    │ Compare with ALL captions:       │
    │ - Caption 1 → 0.87 similarity ✓  │
    │ - Caption 2 → 0.65 similarity    │
    │ - Caption 3 → 0.32 similarity    │
    │ ... (thousands more)             │
    └──────────────┬───────────────────┘
                   ↓
         Top 15 Most Relevant Captions
                   ↓
    ┌──────────────────────────────────┐
    │ NVIDIA Gemma 3 27B LLM          │  <-- Your app.py line 117
    │                                  │      requests.post(NVIDIA_API)
    │ Input: Context + Question        │
    │ Output: Natural language answer  │
    └──────────────┬───────────────────┘
                   ↓
    ╔════════════════════════════════════╗
    ║ ANSWER TO USER                     ║
    ║                                    ║
    ║ "Suspicious activity detected:     ║
    ║ At [22:30:15], a person wearing   ║
    ║ a dark hoodie was observed near   ║
    ║ the ATM, exhibiting nervous       ║
    ║ behavior and loitering for        ║
    ║ approximately 10 seconds."        ║
    ╚════════════════════════════════════╝
""")


# ============================================================================
# WHY THIS WORKS: SEMANTIC SIMILARITY
# ============================================================================

print("\n" + "="*80)
print("WHY NOMIC EMBEDDINGS ARE POWERFUL")
print("="*80)

examples = [
    {
        "query": "suspicious person",
        "matches": ["loitering individual", "person acting nervously", "someone behaving oddly"],
        "why": "Nomic understands these have similar MEANING"
    },
    {
        "query": "vehicle speeding",
        "matches": ["car going fast", "automobile exceeding speed limit", "fast-moving vehicle"],
        "why": "Different words, same concept"
    },
    {
        "query": "fight or violence",
        "matches": ["physical altercation", "two people fighting", "aggressive behavior"],
        "why": "Semantic understanding of violence"
    }
]

for i, example in enumerate(examples, 1):
    print(f"\nExample {i}:")
    print(f"  Query: '{example['query']}'")
    print(f"  Matches these captions:")
    for match in example['matches']:
        print(f"    • '{match}'")
    print(f"  {example['why']}")


# ============================================================================
# THE MATH BEHIND IT
# ============================================================================

print("\n" + "="*80)
print("THE MATH: COSINE SIMILARITY")
print("="*80)

print("""
Nomic converts text to vectors in 768-dimensional space.
Similar meanings = vectors pointing in similar directions.

Formula:
    similarity = cos(θ) = (A · B) / (||A|| × ||B||)
    
Where:
    A = query vector
    B = caption vector
    · = dot product
    || || = vector magnitude (length)

Result: -1.0 to 1.0 (usually 0.0 to 1.0 for text)

Visual representation (simplified to 2D):
    
           ^ Caption B (0.85 similarity)
          /
         /  θ = 32°
        /
       /-------→ Query A
      
    Small angle = High similarity
    Large angle = Low similarity
""")


# ============================================================================
# PRACTICAL DEMO CODE
# ============================================================================

print("\n" + "="*80)
print("PRACTICAL TEST CODE")
print("="*80)

print("""
# Test similarity between two texts:

from langchain_ollama import OllamaEmbeddings
import numpy as np

embeddings = OllamaEmbeddings(model="nomic-embed-text")

# Compare a query with a caption
query = "suspicious person at night"
caption = "individual loitering in dark parking lot"

query_vec = embeddings.embed_query(query)
caption_vec = embeddings.embed_query(caption)

# Calculate cosine similarity
similarity = np.dot(query_vec, caption_vec) / (
    np.linalg.norm(query_vec) * np.linalg.norm(caption_vec)
)

print(f"Similarity: {similarity:.4f}")
# Expected: 0.75-0.85 (high similarity!)
""")


# ============================================================================
# KEY CONFIGURATION IN YOUR APP
# ============================================================================

print("\n" + "="*80)
print("KEY SETTINGS IN YOUR app.py")
print("="*80)

print("""
Line 76-77: Initialize Nomic embeddings
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

Line 93: Configure retrieval
    retriever = vector_store.as_retriever(
        search_type="similarity",  # Use cosine similarity
        search_kwargs={"k": 15}     # Get top 15 matches
    )

Line 94: Execute the query
    relevant_docs = retriever.invoke(query)
    
This ONE LINE does:
  1. Convert query to vector with Nomic
  2. Compare with all caption vectors in ChromaDB
  3. Return top 15 most similar captions
""")


# ============================================================================
# SUMMARY
# ============================================================================

print("\n" + "="*80)
print("SUMMARY: QUERY FLOW IN YOUR CCTV SYSTEM")
print("="*80)

print("""
1. VIDEO CAPTIONS (stored in ChromaDB)
   ↓ Nomic embedding → 768-dim vectors
   
2. USER QUERY (natural language)
   ↓ Nomic embedding → 768-dim vector
   
3. SIMILARITY SEARCH
   ↓ Cosine similarity between query & all captions
   
4. TOP 15 MATCHES
   ↓ Retrieved captions with highest similarity
   
5. LLM PROCESSING
   ↓ NVIDIA Gemma reads context & generates answer
   
6. FINAL ANSWER
   ↓ Natural language response to user

The KEY is Nomic embeddings:
• Converts text → meaningful numbers
• Similar meanings → similar vectors
• Enables semantic search (not just keywords!)
• Works with natural language queries
""")

print("\n" + "="*80)
print("TRY IT YOURSELF:")
print("="*80)
print("""
1. Make sure Ollama is running:
   ollama list

2. Start your server:
   cd CCTV_Querying_System
   python app.py

3. Query via API:
   curl -X POST http://localhost:5010/getResponse \\
     -H "Content-Type: application/json" \\
     -d '{"query": "Show me suspicious activity"}'

4. Watch the flow:
   - Query → Nomic embedding
   - ChromaDB search → Top 15 captions
   - NVIDIA Gemma → Natural answer
""")

print("\n🎯 That's how queries work with Nomic in your CCTV system!\n")

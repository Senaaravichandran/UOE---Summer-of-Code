# Quick Reference: Nomic Embeddings in Your CCTV Query System

## What Nomic Does

**Converts text → 768 numbers that represent meaning**

```
"Person walking in parking lot"  →  [0.23, -0.89, 0.45, ..., 0.12]  (768 numbers)
```

Similar meanings = similar numbers (vectors close together in space)

---

## The Query Flow (5 Steps)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Video Frame                                                │
│    ↓ Florence-2 Vision Model                                  │
│    Caption: "Person walking in parking lot at night"         │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. Nomic Embedding (via Ollama)                              │
│    Text → 768-dimensional vector                             │
│    [0.234, -0.891, 0.456, ..., 0.123]                       │
│    Stored in ChromaDB                                         │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. User Query                                                 │
│    "Show me suspicious activity at night"                    │
│    ↓ Nomic Embedding                                         │
│    Query Vector: [0.123, -0.445, 0.778, ..., -0.234]       │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. ChromaDB Similarity Search                                │
│    Compare query vector with all caption vectors            │
│    Formula: cosine_similarity(query, caption)               │
│    Find top 15 most similar                                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. NVIDIA Gemma LLM                                          │
│    Input: Retrieved captions + user query                   │
│    Output: Natural language answer                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `florenceCaptioning.py` | Converts video → text captions |
| `app.py` | Original Flask API with Nomic |
| `app_optimized.py` | **Improved version** with better performance |
| `nomic_embeddings.py` | Standalone Nomic wrapper class |
| `test_nomic_query.py` | Testing script |

---

## Commands to Run

### 1. Start Ollama (Required!)
```bash
# Make sure Ollama is running with nomic-embed-text model
ollama list  # Check if nomic-embed-text is installed
ollama pull nomic-embed-text  # Install if missing
```

### 2. Start Server (Original)
```bash
cd CCTV_Querying_System
python app.py
# Server runs on http://localhost:5010
```

### 3. Start Server (Optimized - Recommended)
```bash
cd CCTV_Querying_System
python app_optimized.py
# Server runs on http://localhost:5010
```

### 4. Run Tests
```bash
# Full test suite
python test_nomic_query.py

# Interactive mode
python test_nomic_query.py interactive

# Test similarity only
python test_nomic_query.py similarity
```

---

## API Endpoints

### Select Camera & Index Captions
```bash
curl -X POST http://localhost:5010/updateVectorStore \
  -H "Content-Type: application/json" \
  -d '{"place": "Parking_Lot_A"}'
```

### Query CCTV Footage
```bash
curl -X POST http://localhost:5010/getResponse \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me suspicious activity at night"}'
```

### Test Embedding Similarity
```bash
curl -X POST http://localhost:5010/testEmbedding \
  -H "Content-Type: application/json" \
  -d '{
    "text1": "person walking in parking lot",
    "text2": "individual strolling near cars"
  }'

# Returns similarity score 0.0 to 1.0
```

### Get Available Cameras
```bash
curl http://localhost:5010/getCameras
```

### Health Check
```bash
curl http://localhost:5010/health
```

---

## Understanding Similarity Scores

When you query, Nomic computes **cosine similarity** between vectors:

| Score Range | Meaning | Example |
|-------------|---------|---------|
| 0.9 - 1.0 | Nearly identical | "person walking" vs "individual walking" |
| 0.7 - 0.9 | Very similar | "suspicious behavior" vs "person loitering" |
| 0.5 - 0.7 | Related | "vehicle speeding" vs "car in parking lot" |
| 0.3 - 0.5 | Somewhat related | "fight" vs "argument" |
| 0.0 - 0.3 | Different | "person walking" vs "bird flying" |

---

## Example Queries That Work Well

✅ **Good queries** (natural language):
- "Show me suspicious activity at night"
- "Find people entering the building between 2-3 PM"
- "Are there any vehicles speeding?"
- "What happened near the entrance at 5:30?"
- "Find moments when multiple people gathered"

❌ **Avoid** (too specific/hallucination-prone):
- "Show me the exact frame at 2:34:56"
- "What is the license plate number?"
- "What color shirt was the person wearing?"

The system works best for **semantic understanding**, not pixel-perfect details.

---

## Troubleshooting

### Problem: "No matching footage found" for obvious queries

**Solutions:**
1. Check if Ollama is running: `ollama list`
2. Verify caption file exists: `ls data/documents/`
3. Re-index: POST to `/updateVectorStore`
4. Try broader query terms

### Problem: Slow queries (>5 seconds)

**Solutions:**
1. Use `app_optimized.py` instead of `app.py`
2. Reduce `top_k` from 15 to 10
3. Check if Ollama is using GPU (if available)

### Problem: Irrelevant results

**Solutions:**
1. Check caption quality (are Florence-2 captions good?)
2. Reduce chunk_size to 300-400
3. Increase chunk_overlap to 100-150
4. Use more descriptive queries

---

## Key Optimization in app_optimized.py

**Problem in original `app.py`:**
```python
# Created new embeddings model every time (slow!)
embeddings = OllamaEmbeddings(model="nomic-embed-text")  # ❌
```

**Solution in `app_optimized.py`:**
```python
# Create once, reuse everywhere (fast!)
EMBEDDINGS = OllamaEmbeddings(model="nomic-embed-text")  # ✅
```

**Performance improvement:** ~2-3x faster queries!

---

## Task Prefixes (Important!)

Nomic works better with task-specific prefixes:

```python
# For queries (what user types)
query = "search_query: suspicious activity"

# For documents (captions to search)
document = "search_document: Person loitering near ATM"
```

This is automatically added in `app_optimized.py`.

---

## Memory Usage

Nomic model size: ~500 MB in RAM when loaded

ChromaDB typical usage:
- 1,000 captions = ~15 MB
- 10,000 captions = ~150 MB
- 100,000 captions = ~1.5 GB

---

## Further Reading

- **Nomic Embeddings Documentation:** https://docs.nomic.ai/
- **ChromaDB Docs:** https://docs.trychroma.com/
- **Ollama:** https://ollama.ai/

---

## Quick Test

```bash
# 1. Start server
python app_optimized.py

# 2. In another terminal, run tests
python test_nomic_query.py

# 3. Try interactive mode
python test_nomic_query.py interactive
```

If everything works, you'll see:
- ✅ Health check passed
- ✅ Cameras found
- ✅ Embeddings similarity tested
- ✅ Vector store updated
- ✅ Queries answered

---

**Summary:** Nomic converts text → vectors → enables semantic search → finds relevant CCTV footage → LLM generates answer. It's the core technology that makes natural language queries work!

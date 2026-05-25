# How Nomic Embeddings Work in Your CCTV Query System

## Current System Architecture

Your system uses **Nomic-Embed-Text** via Ollama for semantic search in CCTV footage. Here's the complete flow:

---

## 1️⃣ Video Processing & Caption Generation

**File:** `florenceCaptioning.py`

```
Video Frame (every second) 
    ↓
Florence-2 Model (vision-language)
    ↓
Detailed Caption
    ↓
Format: "Timestamp: [H:MM:SS] || Place: {camera_name} || Caption: {description}"
    ↓
Save to: data/documents/{camera_name}.txt
```

**Example Output:**
```
Timestamp: [0:00:01] || Place: Parking_Lot_A || Caption: A person wearing a dark jacket walking towards a blue sedan
Timestamp: [0:00:02] || Place: Parking_Lot_A || Caption: The person opens the car door and enters the vehicle
Timestamp: [0:00:03] || Place: Parking_Lot_A || Caption: The blue sedan's headlights turn on
```

---

## 2️⃣ Embedding & Indexing with Nomic

**File:** `app.py` → `update_vector_store(place)`

### Step-by-step process:

#### A) Load Caption Text
```python
loader = TextLoader(file_path, encoding='utf-8')
documents = loader.load()
```

#### B) Chunk Text
```python
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,      # Each chunk = ~700 characters
    chunk_overlap=150    # 150 char overlap for context continuity
)
splits = text_splitter.split_documents(documents)
```

**Why chunking?**
- Nomic can handle 8,192 tokens, but smaller chunks give more precise retrieval
- Overlap ensures temporal context isn't lost between chunks

#### C) Generate Embeddings with Nomic
```python
embeddings = OllamaEmbeddings(model="nomic-embed-text")
```

**What happens internally:**

1. **Text Input** → Your caption text (e.g., "Timestamp: [0:00:01] || Place: Parking_Lot_A || Caption: A person wearing...")

2. **Tokenization** → Breaks text into tokens using Nomic's tokenizer

3. **Embedding Model** → Runs through Nomic's transformer layers
   ```
   Input Tokens → BERT-style Encoder → 768-dimensional vector
   ```

4. **Output Vector** → Dense representation: `[0.234, -0.891, 0.456, ..., 0.123]` (768 numbers)

5. **Semantic Meaning** → This vector captures the **meaning** of the text:
   - Similar events → Similar vectors (close in vector space)
   - Different events → Different vectors (far apart)

#### D) Store in ChromaDB
```python
vector_store = Chroma.from_documents(
    documents=splits,
    embedding=embeddings,
    client=chroma_client,
    collection_name=COLLECTION_NAME
)
```

**ChromaDB stores:**
- Original text chunks
- 768-dim Nomic embeddings
- Metadata (timestamps, locations)

---

## 3️⃣ Query Processing with Nomic

**File:** `app.py` → `get_response_from_gemini(query)`

### When user asks: "Show me suspicious activity near the parking lot"

#### A) Embed the Query
```python
embeddings = OllamaEmbeddings(model="nomic-embed-text")
```

**Same Nomic model** converts your query into a 768-dim vector:
```
"Show me suspicious activity near the parking lot"
    ↓
[0.123, -0.445, 0.778, ..., -0.234]  (query vector)
```

#### B) Find Similar Vectors (Semantic Search)
```python
retriever = vector_store.as_retriever(
    search_type="similarity", 
    search_kwargs={"k": 15}  # Get top 15 matches
)
relevant_docs = retriever.invoke(query)
```

**Math Behind It:**

ChromaDB computes **cosine similarity** between query vector and all stored vectors:

$$
\text{similarity}(q, d) = \frac{q \cdot d}{||q|| \cdot ||d||} = \cos(\theta)
$$

Where:
- $q$ = query embedding vector
- $d$ = document embedding vector
- Result ranges from -1 (opposite) to +1 (identical)

**Example scores:**
```
Query: "suspicious activity near parking lot"

Document 1: "Person loitering near cars at night"     → 0.87 ✓ (very relevant)
Document 2: "Car parked in loading zone"               → 0.65   (somewhat relevant)
Document 3: "Bird flying over building"                → 0.23   (not relevant)
```

Top 15 highest-scoring chunks are retrieved.

#### C) Build Context
```python
context = "\n".join([doc.page_content for doc in relevant_docs])
```

Retrieved chunks are concatenated into context string.

#### D) Query LLM with Context
```python
human_prompt = f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
```

NVIDIA Gemma model receives:
- **Context:** Retrieved CCTV captions (top 15 relevant chunks)
- **Question:** User's original query
- **System Prompt:** Instructions for law enforcement analysis

#### E) Stream Response
```python
response = requests.post(NVIDIA_INVOKE_URL, json=payload, stream=True)
```

LLM generates answer based on retrieved context only.

---

## 4️⃣ Why Nomic Embeddings Are Perfect for This

### Advantages in your system:

1. **Long Context (8,192 tokens)**
   - Can embed entire multi-minute CCTV caption sequences
   - Better temporal understanding

2. **High Quality Semantic Search**
   - "suspicious person" matches "loitering individual"
   - "vehicle speeding" matches "car going fast"
   - Natural language queries work intuitively

3. **Efficient Local Inference**
   - Runs via Ollama locally
   - No API costs for embeddings
   - Privacy-preserving (no data sent to cloud)

4. **Optimized for Retrieval**
   - Trained specifically for search/retrieval tasks
   - Outperforms generic sentence transformers

---

## 5️⃣ Query Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER QUERY                                   │
│             "Show me fights at 2:30 PM"                         │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
                    ┌────────────────┐
                    │ Nomic Embedding│
                    │  (via Ollama)  │
                    └────────┬───────┘
                             ↓
                    Query Vector [768-dim]
                             ↓
              ┌──────────────────────────────┐
              │      ChromaDB Search          │
              │  (Cosine Similarity)         │
              │                              │
              │  Compare with all stored     │
              │  caption embeddings          │
              └──────────────┬───────────────┘
                             ↓
            Top 15 Most Relevant Caption Chunks
                             ↓
              ┌──────────────────────────────┐
              │     NVIDIA Gemma 3 27B       │
              │  (with retrieved context)    │
              └──────────────┬───────────────┘
                             ↓
              ┌──────────────────────────────┐
              │  Structured Answer           │
              │                              │
              │  "At [2:30:15], two people   │
              │   were observed in a physical│
              │   altercation near the main  │
              │   entrance..."               │
              └──────────────────────────────┘
```

---

## 6️⃣ Performance Optimization Tips

### Current Setup Issues:

1. **Re-creating embeddings model each time:**
```python
# In update_vector_store()
embeddings = OllamaEmbeddings(model="nomic-embed-text")

# In get_response_from_gemini()
embeddings = OllamaEmbeddings(model="nomic-embed-text")  # ❌ Duplicate
```

**Solution:** Initialize once globally:
```python
# At top of app.py
EMBEDDINGS = OllamaEmbeddings(model="nomic-embed-text")
```

2. **No batch processing for large videos**

**Solution:** Process frames in parallel batches.

3. **Fixed chunk size might split timestamps awkwardly**

**Solution:** Use custom text splitter that respects timestamp boundaries.

---

## 7️⃣ Advanced Query Examples

### Simple Queries
```
"Show me all people entering the building"
"Find vehicles speeding"
"What happened at 3:15 PM?"
```

### Complex Queries (Nomic handles these well)
```
"Find moments when someone was loitering near the ATM for more than 30 seconds"
"Show me aggressive behavior or fights"
"Identify delivery trucks arriving after business hours"
"Find people climbing fences or entering restricted areas"
```

### Time-based Queries
```
"What happened between 2:00 PM and 3:00 PM?"
"Show me suspicious activity at night"
"Find all incidents in the last hour"
```

---

## 8️⃣ Key Nomic Configuration

### For Best Results:

#### Query with Task Prefix:
```python
# Instead of raw query:
query = "suspicious activity"

# Use task-specific prefix:
query = "search_query: suspicious activity"
```

#### Document with Task Prefix:
```python
# When creating embeddings:
caption_with_prefix = f"search_document: {caption}"
```

This tells Nomic to optimize embeddings for search/retrieval.

---

## 9️⃣ Debugging & Monitoring

### Check Embedding Quality:

```python
# Add to app.py for debugging
@app.route("/testSimilarity", methods=["POST"])
def test_similarity():
    data = request.json
    text1 = data.get("text1")
    text2 = data.get("text2")
    
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    
    vec1 = embeddings.embed_query(text1)
    vec2 = embeddings.embed_query(text2)
    
    # Cosine similarity
    import numpy as np
    similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
    
    return jsonify({
        "text1": text1,
        "text2": text2,
        "similarity": float(similarity)
    })
```

Test with:
```bash
curl -X POST http://localhost:5010/testSimilarity \
  -H "Content-Type: application/json" \
  -d '{
    "text1": "Person walking in parking lot",
    "text2": "Individual strolling near parked cars"
  }'

# Expected: similarity ~ 0.75-0.85 (high)
```

---

## 🔟 Common Issues & Solutions

### Issue 1: "No matching footage found" for obvious queries

**Cause:** Query and caption vocabulary mismatch

**Solution:** 
- Add query expansion
- Use more descriptive Florence-2 prompts
- Try synonym-aware queries

### Issue 2: Slow query response

**Cause:** Re-initializing Ollama connection each time

**Solution:** 
- Keep embeddings model in memory
- Use connection pooling
- Consider GPU acceleration

### Issue 3: Irrelevant results returned

**Cause:** 
- Chunk size too large
- Not enough context in captions
- Nomic not running properly

**Solution:**
- Reduce chunk_size to 500
- Increase chunk_overlap to 200
- Verify Ollama is running: `ollama list`

---

## Summary

**Your query system with Nomic:**

1. **Video** → Florence-2 captions → Text corpus
2. **Captions** → Nomic embeddings → 768-dim vectors → ChromaDB
3. **User Query** → Nomic embedding → 768-dim vector
4. **ChromaDB** → Cosine similarity search → Top 15 matches
5. **NVIDIA Gemma** → Generate answer from retrieved context

**Key Insight:** Nomic converts text → meaning → numbers, enabling semantic search that understands intent, not just keywords!

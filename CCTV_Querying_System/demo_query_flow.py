"""
PRACTICAL DEMO: Query with Nomic Embeddings
============================================

Run this to see EXACTLY how your query system works!

Prerequisites:
    pip install langchain-ollama numpy
    ollama pull nomic-embed-text
"""

from langchain_ollama import OllamaEmbeddings
import numpy as np

print("\n" + "="*80)
print("🎯 NOMIC QUERY DEMO - STEP BY STEP")
print("="*80)

# Initialize Nomic (same as your app.py line 76)
print("\n📌 Step 1: Initialize Nomic Embeddings...")
embeddings = OllamaEmbeddings(model="nomic-embed-text")
print("✅ Nomic model loaded!\n")


# ============================================================================
# DEMO 1: How a single query works
# ============================================================================

print("="*80)
print("DEMO 1: HOW YOUR QUERY GETS PROCESSED")
print("="*80)

user_query = "Show me suspicious activity at night"
print(f"\n🔍 User asks: '{user_query}'")

print("\n⏳ Converting query to Nomic embedding...")
query_vector = embeddings.embed_query(user_query)

print(f"✅ Query converted to vector!")
print(f"   • Dimensions: {len(query_vector)}")
print(f"   • First 5 values: {query_vector[:5]}")
print(f"   • Last 5 values: {query_vector[-5:]}")
print(f"   • Vector magnitude: {np.linalg.norm(query_vector):.4f}")


# ============================================================================
# DEMO 2: Compare query with different captions
# ============================================================================

print("\n\n" + "="*80)
print("DEMO 2: SIMILARITY SCORES IN ACTION")
print("="*80)

print(f"\n🔍 Query: '{user_query}'")
print("\n⏳ Computing similarity with different captions...\n")

# Sample captions from CCTV (like what's in your ChromaDB)
test_captions = [
    {
        "text": "Person loitering near ATM at night wearing dark clothing",
        "expected": "HIGH"
    },
    {
        "text": "Individual walking through parking lot after dark",
        "expected": "HIGH"
    },
    {
        "text": "Car parked in loading zone during daytime",
        "expected": "LOW"
    },
    {
        "text": "Bird flying over the building at noon",
        "expected": "VERY LOW"
    },
    {
        "text": "Person behaving strangely near entrance at 10 PM",
        "expected": "HIGH"
    }
]

results = []

for i, caption_info in enumerate(test_captions, 1):
    caption = caption_info["text"]
    
    # Convert caption to vector (same process as indexing)
    caption_vector = embeddings.embed_query(caption)
    
    # Calculate cosine similarity
    similarity = np.dot(query_vector, caption_vector) / (
        np.linalg.norm(query_vector) * np.linalg.norm(caption_vector)
    )
    
    results.append((caption, similarity, caption_info["expected"]))
    
    # Color code based on similarity
    if similarity > 0.7:
        indicator = "🟢 HIGH"
        color_bar = "█" * int(similarity * 50)
    elif similarity > 0.5:
        indicator = "🟡 MEDIUM"
        color_bar = "▓" * int(similarity * 50)
    else:
        indicator = "🔴 LOW"
        color_bar = "░" * int(similarity * 50)
    
    print(f"{i}. Similarity: {similarity:.4f} {indicator}")
    print(f"   {color_bar}")
    print(f"   Caption: {caption[:70]}...")
    print(f"   Expected: {caption_info['expected']}")
    print()

# Sort by similarity (highest first)
results.sort(key=lambda x: x[1], reverse=True)

print("\n📊 RESULTS RANKED BY RELEVANCE:")
print("-" * 80)
for i, (caption, score, expected) in enumerate(results, 1):
    print(f"{i}. [{score:.4f}] {caption[:65]}...")

print("\n✅ This is exactly what ChromaDB does!")
print("   It returns the top 15 most similar captions to the LLM.")


# ============================================================================
# DEMO 3: Understanding semantic similarity
# ============================================================================

print("\n\n" + "="*80)
print("DEMO 3: WHY NOMIC UNDERSTANDS MEANING, NOT JUST WORDS")
print("="*80)

semantic_tests = [
    {
        "description": "Exact match",
        "text1": "person walking in parking lot",
        "text2": "person walking in parking lot"
    },
    {
        "description": "Same meaning, different words",
        "text1": "person walking in parking lot",
        "text2": "individual strolling near parked cars"
    },
    {
        "description": "Related concepts",
        "text1": "suspicious activity",
        "text2": "person behaving strangely"
    },
    {
        "description": "Completely different",
        "text1": "person walking in parking lot",
        "text2": "bird flying in the sky"
    }
]

print("\n🧪 Testing semantic understanding...\n")

for i, test in enumerate(semantic_tests, 1):
    vec1 = embeddings.embed_query(test["text1"])
    vec2 = embeddings.embed_query(test["text2"])
    
    similarity = np.dot(vec1, vec2) / (
        np.linalg.norm(vec1) * np.linalg.norm(vec2)
    )
    
    print(f"Test {i}: {test['description']}")
    print(f"  Text 1: '{test['text1']}'")
    print(f"  Text 2: '{test['text2']}'")
    print(f"  Similarity: {similarity:.4f}")
    
    if similarity > 0.8:
        print(f"  ✅ Very similar - Nomic recognizes they're almost identical")
    elif similarity > 0.6:
        print(f"  ✅ Similar - Nomic sees the semantic connection")
    elif similarity > 0.4:
        print(f"  ⚠️  Somewhat related - Some connection detected")
    else:
        print(f"  ❌ Different - Nomic correctly identifies they're unrelated")
    print()


# ============================================================================
# DEMO 4: The actual query flow in your system
# ============================================================================

print("\n" + "="*80)
print("DEMO 4: SIMULATING YOUR ACTUAL QUERY FLOW")
print("="*80)

print("\n📝 Simulating a complete query like in your app.py...\n")

# Simulated CCTV captions (what would be in ChromaDB)
stored_captions = [
    "Timestamp: [22:30:15] || Place: ATM_Lobby || Caption: Person wearing dark hoodie near ATM",
    "Timestamp: [22:30:20] || Place: ATM_Lobby || Caption: Same person looking around nervously",
    "Timestamp: [22:31:10] || Place: Parking_Lot || Caption: Car speeding through parking lot",
    "Timestamp: [14:20:30] || Place: Main_Entrance || Caption: Delivery person entering building",
    "Timestamp: [22:30:25] || Place: ATM_Lobby || Caption: Person loitering for extended period",
    "Timestamp: [10:15:00] || Place: Courtyard || Caption: People having lunch in courtyard",
    "Timestamp: [22:32:00] || Place: ATM_Lobby || Caption: Person repeatedly touching ATM machine",
    "Timestamp: [16:45:00] || Place: Main_Gate || Caption: Security guard on routine patrol",
]

query = "Find suspicious people near the ATM at night"
print(f"🔍 Query: '{query}'")

print("\n⏳ Step 1: Converting query to vector...")
query_vec = embeddings.embed_query(query)
print("✅ Done!")

print("\n⏳ Step 2: Computing similarity with all captions...")
similarities = []

for caption in stored_captions:
    caption_vec = embeddings.embed_query(caption)
    similarity = np.dot(query_vec, caption_vec) / (
        np.linalg.norm(query_vec) * np.linalg.norm(caption_vec)
    )
    similarities.append((caption, similarity))

print("✅ Done!")

# Sort by similarity (highest first) - this is what ChromaDB does
similarities.sort(key=lambda x: x[1], reverse=True)

print("\n⏳ Step 3: Retrieving top 5 most relevant captions...")
print("✅ Done!\n")

print("📊 TOP 5 RESULTS (what gets sent to the LLM):")
print("-" * 80)

for i, (caption, score) in enumerate(similarities[:5], 1):
    print(f"\n{i}. Similarity: {score:.4f}")
    print(f"   {caption}")

print("\n" + "-" * 80)
print("\n✅ These top results would be sent to NVIDIA Gemma for answer generation!")


# ============================================================================
# SUMMARY
# ============================================================================

print("\n\n" + "="*80)
print("🎓 SUMMARY: HOW YOUR QUERY SYSTEM WORKS")
print("="*80)

print("""
YOUR QUERY FLOW (in app.py):

1️⃣  Line 76-77: Initialize Nomic
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

2️⃣  Line 93-94: Setup retriever and execute query
    retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 15})
    relevant_docs = retriever.invoke(query)
    
    What happens here:
    • Query → Nomic embedding (768-dim vector)
    • Compare with ALL caption vectors in ChromaDB
    • Use cosine similarity: similarity = (A·B) / (||A|| × ||B||)
    • Sort by similarity score
    • Return top 15 matches

3️⃣  Line 95: Build context from retrieved captions
    context = "\\n".join([doc.page_content for doc in relevant_docs])

4️⃣  Line 117+: Send context to NVIDIA Gemma LLM
    LLM reads the context and generates natural language answer

KEY TAKEAWAY:
• Nomic converts text → vectors that represent MEANING
• Similar meanings → vectors point in similar directions
• ChromaDB finds these similar vectors lightning fast
• Your system understands "suspicious person" = "loitering individual"
• This is why natural language queries work!
""")

print("\n" + "="*80)
print("✅ DEMO COMPLETE!")
print("="*80)

print("\n💡 To see this in your actual system:")
print("   1. Start your server: python app.py")
print("   2. Select a camera (POST /updateVectorStore)")
print("   3. Query: POST /getResponse with any question")
print("   4. Watch the magic happen! 🎩✨\n")

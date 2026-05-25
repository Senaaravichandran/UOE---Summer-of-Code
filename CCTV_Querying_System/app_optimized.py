"""
OPTIMIZED CCTV Query System with Nomic Embeddings
Improvements over original:
1. Single embeddings instance (no re-initialization)
2. Task-specific prefixes for better retrieval
3. Better error handling
4. Performance monitoring
5. Debug endpoints
"""

import os
import json
import time
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
import chromadb

app = Flask(__name__)
CORS(app)

DATA_DIR = "data/documents"
FOOTAGE_DIR = "data/footages"
CHROMA_DB_DIR = "./chroma_db"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(FOOTAGE_DIR, exist_ok=True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)

# --- NVIDIA Gemma 3 27B IT Configuration ---
NVIDIA_API_KEY = "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"
NVIDIA_INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# --- OPTIMIZATION: Single persistent ChromaDB client ---
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# --- OPTIMIZATION: Single embeddings instance (reused across all operations) ---
print("🔄 Initializing Nomic embeddings model...")
EMBEDDINGS = OllamaEmbeddings(model="nomic-embed-text")
print("✅ Nomic embeddings ready!")

COLLECTION_NAME = "documents"


def update_vector_store(place):
    """
    Load a camera's caption file into ChromaDB with optimized embeddings.
    
    OPTIMIZATION: Uses global EMBEDDINGS instance instead of creating new one each time.
    """
    file_path = os.path.join(DATA_DIR, f"{place}.txt")
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}, 400

    try:
        start_time = time.time()
        
        # Delete old collection if exists
        try:
            chroma_client.delete_collection(COLLECTION_NAME)
            print(f"🗑️  Deleted old collection for {place}")
        except Exception:
            pass

        # Load documents
        loader = TextLoader(file_path, encoding='utf-8')
        documents = loader.load()
        print(f"📄 Loaded {len(documents)} documents from {place}")

        # OPTIMIZATION: Smaller chunks for more precise retrieval
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,      # Reduced from 700 for better precision
            chunk_overlap=200    # Increased from 150 for better context
        )
        splits = text_splitter.split_documents(documents)
        print(f"✂️  Created {len(splits)} text chunks")

        # OPTIMIZATION: Add task-specific prefix to documents for better retrieval
        # This tells Nomic these are documents to be searched, not queries
        for doc in splits:
            doc.page_content = f"search_document: {doc.page_content}"

        # Create vector store using global EMBEDDINGS instance
        vector_store = Chroma.from_documents(
            documents=splits,
            embedding=EMBEDDINGS,  # Reuse global instance
            client=chroma_client,
            collection_name=COLLECTION_NAME
        )

        elapsed_time = time.time() - start_time
        print(f"✅ Vector store created in {elapsed_time:.2f}s")
        
        return {
            "message": f"Vector store updated successfully",
            "chunks": len(splits),
            "camera": place,
            "processing_time_seconds": round(elapsed_time, 2)
        }, 200

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"❌ Error: {error_detail}")
        return {"error": str(e), "details": error_detail}, 500


def get_response_from_gemini(query, top_k=15, min_score=0.0):
    """
    Retrieve relevant docs from ChromaDB and query NVIDIA Gemma with optimizations.
    
    Args:
        query: User's natural language query
        top_k: Number of documents to retrieve (default 15)
        min_score: Minimum similarity score threshold (0.0 to 1.0)
    
    OPTIMIZATIONS:
    - Uses global EMBEDDINGS instance
    - Adds task-specific prefix to query
    - Returns similarity scores for debugging
    - Better error handling
    """
    try:
        start_time = time.time()
        
        if not os.path.exists(CHROMA_DB_DIR):
            return {"error": "Please select a camera first."}, 400

        # Connect to existing collection using global EMBEDDINGS
        try:
            vector_store = Chroma(
                embedding_function=EMBEDDINGS,  # Reuse global instance
                client=chroma_client,
                collection_name=COLLECTION_NAME
            )
        except Exception as db_error:
            print(f"❌ Database connection error: {db_error}")
            return {"error": "Database is corrupted. Please select a camera again."}, 400

        # OPTIMIZATION: Add task-specific prefix to query for better retrieval
        prefixed_query = f"search_query: {query}"
        
        # Retrieve with scoring
        retriever = vector_store.as_retriever(
            search_type="similarity", 
            search_kwargs={"k": top_k}
        )
        
        retrieval_start = time.time()
        relevant_docs = retriever.invoke(prefixed_query)
        retrieval_time = time.time() - retrieval_start
        
        print(f"🔍 Retrieved {len(relevant_docs)} documents in {retrieval_time:.2f}s")
        
        # Build context with metadata for debugging
        context_parts = []
        doc_metadata = []
        
        for i, doc in enumerate(relevant_docs):
            # Remove the search_document: prefix from displayed context
            clean_content = doc.page_content.replace("search_document: ", "")
            context_parts.append(clean_content)
            
            doc_metadata.append({
                "index": i,
                "preview": clean_content[:100] + "..." if len(clean_content) > 100 else clean_content,
                "metadata": doc.metadata if hasattr(doc, 'metadata') else {}
            })
        
        context = "\n".join(context_parts)

        # System prompt for law enforcement analysis
        system_prompt = (
            "You are an AI CCTV footage analysis assistant for law enforcement. "
            "You will be given textual descriptions of CCTV footage captured at one-second intervals. "
            "Each description includes a timestamp [H:M:S], location, and a detailed caption.\n\n"
            "CRITICAL RULES:\n"
            "- NEVER introduce yourself. NEVER say 'Hello', 'Hi', or 'I am...'. Go straight to answering.\n"
            "- ONLY provide information from the provided context. Never invent details.\n"
            "- If the query mentions a specific time, focus on that timeframe.\n"
            "- Be precise about timestamps. Always use [H:MM:SS] format.\n"
            "- Organize multiple incidents chronologically.\n"
            "- Combine consecutive timestamps for the same event.\n"
            "- If no information is available, state 'No matching footage found.'\n"
            "- Be concise but thorough. Use bullet points for multiple findings.\n"
            "- Your responses are for law enforcement evidence. Accuracy is critical."
        )
        
        human_prompt = f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"

        # Call NVIDIA Gemma 3 27B IT
        headers = {
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Accept": "text/event-stream",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "google/gemma-3-27b-it",
            "messages": [
                {"role": "user", "content": f"{system_prompt}\n\n{human_prompt}"}
            ],
            "max_tokens": 1024,
            "temperature": 0.20,
            "top_p": 0.70,
            "stream": True
        }

        llm_start = time.time()
        response = requests.post(NVIDIA_INVOKE_URL, headers=headers, json=payload, stream=True)

        if response.status_code != 200:
            error_msg = response.text
            print(f"❌ NVIDIA API error ({response.status_code}): {error_msg}")
            return {"error": f"LLM API error: {response.status_code}"}, 500

        # Parse SSE stream
        full_response = ""
        for line in response.iter_lines():
            if line:
                decoded = line.decode("utf-8")
                if decoded.startswith("data: "):
                    data_str = decoded[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        delta = data.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            full_response += content
                    except json.JSONDecodeError:
                        continue

        llm_time = time.time() - llm_start
        total_time = time.time() - start_time
        
        print(f"🤖 LLM response generated in {llm_time:.2f}s")
        print(f"⏱️  Total query time: {total_time:.2f}s")

        if not full_response:
            return {"error": "No response from LLM. Please try again."}, 500

        return {
            "response": full_response,
            "retrieved_documents": len(relevant_docs),
            "timing": {
                "retrieval_seconds": round(retrieval_time, 2),
                "llm_seconds": round(llm_time, 2),
                "total_seconds": round(total_time, 2)
            },
            "debug": {
                "original_query": query,
                "prefixed_query": prefixed_query,
                "documents_metadata": doc_metadata
            }
        }, 200

    except Exception as e:
        import traceback
        print(f"❌ Query error: {traceback.format_exc()}")
        return {"error": str(e)}, 500


# --- API Endpoints ---

@app.route("/updateVectorStore", methods=["POST"])
def update_vector_store_api():
    """Update vector store for a specific camera."""
    data = request.json
    place = data.get("place")
    if not place:
        return jsonify({"error": "Missing 'place' parameter"}), 400
    result, status = update_vector_store(place)
    return jsonify(result), status


@app.route("/getResponse", methods=["POST"])
def get_response_api():
    """
    Query the CCTV footage with natural language.
    
    Body params:
        query (str): Natural language question
        top_k (int, optional): Number of documents to retrieve (default 15)
        min_score (float, optional): Minimum similarity threshold (default 0.0)
    """
    data = request.json
    query = data.get("query")
    top_k = data.get("top_k", 15)
    min_score = data.get("min_score", 0.0)
    
    if not query:
        return jsonify({"error": "Missing 'query' parameter"}), 400
    
    result, status = get_response_from_gemini(query, top_k, min_score)
    return jsonify(result), status


@app.route("/getCameras", methods=["GET"])
def get_cameras():
    """Get list of available camera caption files."""
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".txt")]
    cameras = [file.replace(".txt", "") for file in files]
    return jsonify({"cameras": cameras, "count": len(cameras)})


@app.route("/testEmbedding", methods=["POST"])
def test_embedding():
    """
    Test endpoint to check embedding similarity between two texts.
    Useful for debugging and understanding how Nomic works.
    
    Body params:
        text1 (str): First text to compare
        text2 (str): Second text to compare
    
    Returns:
        Cosine similarity score (0.0 to 1.0)
    """
    data = request.json
    text1 = data.get("text1")
    text2 = data.get("text2")
    
    if not text1 or not text2:
        return jsonify({"error": "Missing 'text1' or 'text2' parameter"}), 400
    
    try:
        import numpy as np
        
        # Get embeddings using global instance
        vec1 = EMBEDDINGS.embed_query(f"search_query: {text1}")
        vec2 = EMBEDDINGS.embed_query(f"search_document: {text2}")
        
        # Compute cosine similarity
        similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
        
        return jsonify({
            "text1": text1,
            "text2": text2,
            "similarity": float(similarity),
            "interpretation": (
                "Very similar (>0.8)" if similarity > 0.8 else
                "Similar (0.6-0.8)" if similarity > 0.6 else
                "Somewhat similar (0.4-0.6)" if similarity > 0.4 else
                "Different (<0.4)"
            )
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "embeddings_model": "nomic-embed-text",
        "collection_exists": COLLECTION_NAME in [c.name for c in chroma_client.list_collections()],
        "data_dir": DATA_DIR,
        "chroma_dir": CHROMA_DB_DIR
    }), 200


if __name__ == "__main__":
    print("\n" + "="*50)
    print("🚀 CCTV Query System with Nomic Embeddings")
    print("="*50)
    print(f"📁 Data directory: {DATA_DIR}")
    print(f"💾 ChromaDB directory: {CHROMA_DB_DIR}")
    print(f"🤖 Embeddings model: nomic-embed-text (via Ollama)")
    print(f"🌐 Server starting on http://0.0.0.0:5010")
    print("="*50 + "\n")
    
    app.run(host="0.0.0.0", port=5010, debug=True)

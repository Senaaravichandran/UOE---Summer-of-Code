import os
import json
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

# --- Single persistent ChromaDB client (survives video switches) ---
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

COLLECTION_NAME = "documents"


def update_vector_store(place):
    """Load a camera's caption file into ChromaDB, replacing any previous collection."""
    file_path = os.path.join(DATA_DIR, f"{place}.txt")
    if not os.path.exists(file_path):
        return {"error": "File not found"}, 400

    try:
        # Safely delete the old collection (no file-system deletion needed)
        try:
            chroma_client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass  # Collection may not exist yet — that's fine

        loader = TextLoader(file_path, encoding='utf-8')
        documents = loader.load()
        print(f"Loaded {len(documents)} documents")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=150)
        splits = text_splitter.split_documents(documents)
        print(f"Created {len(splits)} text chunks")

        embeddings = OllamaEmbeddings(model="nomic-embed-text")

        # Create new collection through LangChain, reusing the persistent client
        vector_store = Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            client=chroma_client,
            collection_name=COLLECTION_NAME
        )

        print("Vector store created successfully")
        return {"message": f"Vector store updated successfully with {len(splits)} chunks"}, 200

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error: {error_detail}")
        return {"error": str(e)}, 500


def get_response_from_gemini(query):
    """Retrieve relevant docs from ChromaDB and query NVIDIA Gemma 3 27B IT."""
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    try:
        if not os.path.exists(CHROMA_DB_DIR):
            return {"error": "Please select a camera first."}, 400

        # Connect to existing collection via the persistent client
        try:
            vector_store = Chroma(
                embedding_function=embeddings,
                client=chroma_client,
                collection_name=COLLECTION_NAME
            )
        except Exception as db_error:
            print(f"Database connection error: {db_error}")
            return {"error": "Database is corrupted. Please select a camera again to rebuild."}, 400

        retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 15})
        relevant_docs = retriever.invoke(query)
        context = "\n".join([doc.page_content for doc in relevant_docs])

        system_prompt = (
            "You are an AI CCTV footage analysis assistant for law enforcement. "
            "You will be given textual descriptions of CCTV footage captured at one-second intervals. "
            "Each description includes a timestamp [H:M:S], location, and a detailed caption.\n\n"
            "CRITICAL RULES:\n"
            "- NEVER introduce yourself. NEVER say 'Hello', 'Hi', or 'I am...'. Go straight to answering the question.\n"
            "- ONLY provide information that exists in the provided context. Never invent or assume details.\n"
            "- If the query mentions a specific time or time range, focus on events within that timeframe.\n"
            "- Be precise about timestamps. Always provide them in [H:MM:SS] format.\n"
            "- If multiple relevant incidents are found, organize them chronologically.\n"
            "- Combine consecutive timestamps that describe the same object/event into a single entry.\n"
            "- If no information is available for the query, clearly state 'No matching footage found for the specified criteria.'\n"
            "- Be concise but thorough. Use bullet points for multiple findings.\n"
            "- Your responses are used for law enforcement evidence, so accuracy is critical.\n"
            "- ONLY introduce yourself if the user explicitly asks 'who are you' or 'what are you'."
        )
        human_prompt = f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"

        # --- Call NVIDIA Gemma 3 27B IT ---
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

        response = requests.post(NVIDIA_INVOKE_URL, headers=headers, json=payload, stream=True)

        if response.status_code != 200:
            error_msg = response.text
            print(f"NVIDIA API error ({response.status_code}): {error_msg}")
            return {"error": f"LLM API error: {response.status_code}"}, 500

        # Parse SSE stream
        full_response = ""
        for line in response.iter_lines():
            if line:
                decoded = line.decode("utf-8")
                if decoded.startswith("data: "):
                    data_str = decoded[6:]  # strip "data: " prefix
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

        if not full_response:
            return {"error": "No response from LLM. Please try again."}, 500

        return {"response": full_response, "retrieved_documents": context}, 200

    except Exception as e:
        import traceback
        print(f"Query error: {traceback.format_exc()}")
        return {"error": str(e)}, 500


@app.route("/updateVectorStore", methods=["POST"])
def update_vector_store_api():
    data = request.json
    place = data.get("place")
    if not place:
        return {"error": "Missing 'place' parameter"}, 400
    return update_vector_store(place)


@app.route("/getResponse", methods=["POST"])
def get_response_api():
    data = request.json
    query = data.get("query")
    if not query:
        return {"error": "Missing 'query' parameter"}, 400
    return get_response_from_gemini(query)


@app.route("/getCameras", methods=["GET"])
def get_cameras():
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".txt")]
    files = [file.split(".")[0] for file in files]
    return jsonify({"cameras": files})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5010, debug=True)

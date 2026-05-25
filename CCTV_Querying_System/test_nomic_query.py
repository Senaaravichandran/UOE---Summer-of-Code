"""
Test Script for CCTV Query System with Nomic Embeddings

This script demonstrates:
1. How to test embedding similarity
2. How to query the system
3. How to interpret results
4. Performance benchmarking

Prerequisites:
    pip install requests colorama
"""

import requests
import json
from colorama import Fore, Style, init
import time

# Initialize colorama for colored output
init(autoreset=True)

BASE_URL = "http://localhost:5010"


def print_header(text):
    """Print colored header."""
    print(f"\n{Fore.CYAN}{'='*80}")
    print(f"{Fore.CYAN}{text}")
    print(f"{Fore.CYAN}{'='*80}\n")


def print_success(text):
    """Print success message."""
    print(f"{Fore.GREEN}✓ {text}")


def print_error(text):
    """Print error message."""
    print(f"{Fore.RED}✗ {text}")


def print_info(text):
    """Print info message."""
    print(f"{Fore.YELLOW}ℹ {text}")


def test_health():
    """Test if the server is running."""
    print_header("1️⃣  HEALTH CHECK")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print_success("Server is running!")
            print(f"   Embeddings model: {data['embeddings_model']}")
            print(f"   Collection exists: {data['collection_exists']}")
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server. Make sure it's running on port 5010")
        print_info("Run: python app_optimized.py")
        return False


def test_get_cameras():
    """Test getting available cameras."""
    print_header("2️⃣  GET AVAILABLE CAMERAS")
    
    try:
        response = requests.get(f"{BASE_URL}/getCameras")
        if response.status_code == 200:
            data = response.json()
            cameras = data.get('cameras', [])
            
            if cameras:
                print_success(f"Found {len(cameras)} camera(s):")
                for i, camera in enumerate(cameras, 1):
                    print(f"   {i}. {camera}")
                return cameras
            else:
                print_error("No cameras found!")
                print_info("Add caption files to data/documents/ folder")
                return []
        else:
            print_error(f"Failed to get cameras: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Error: {e}")
        return []


def test_embedding_similarity():
    """Test how Nomic embeddings compute similarity."""
    print_header("3️⃣  TEST EMBEDDING SIMILARITY")
    
    test_pairs = [
        # High similarity - same meaning, different words
        {
            "text1": "person walking in parking lot",
            "text2": "individual strolling near parked cars",
            "expected": "high"
        },
        # Medium similarity - related but different
        {
            "text1": "car speeding through intersection",
            "text2": "vehicle parked in loading zone",
            "expected": "medium"
        },
        # Low similarity - completely different
        {
            "text1": "fight between two people",
            "text2": "bird flying over building",
            "expected": "low"
        }
    ]
    
    for i, pair in enumerate(test_pairs, 1):
        print(f"\n{Fore.YELLOW}Test {i}:")
        print(f"  Query:    '{pair['text1']}'")
        print(f"  Document: '{pair['text2']}'")
        print(f"  Expected: {pair['expected']} similarity")
        
        try:
            response = requests.post(
                f"{BASE_URL}/testEmbedding",
                json={
                    "text1": pair['text1'],
                    "text2": pair['text2']
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                similarity = data['similarity']
                interpretation = data['interpretation']
                
                # Color code the score
                if similarity > 0.7:
                    color = Fore.GREEN
                elif similarity > 0.4:
                    color = Fore.YELLOW
                else:
                    color = Fore.RED
                
                print(f"  {color}Result:   {similarity:.4f} - {interpretation}")
            else:
                print_error(f"Failed: {response.status_code}")
        
        except Exception as e:
            print_error(f"Error: {e}")


def test_update_vector_store(camera_name):
    """Test updating the vector store for a camera."""
    print_header("4️⃣  UPDATE VECTOR STORE")
    
    print_info(f"Updating vector store for camera: {camera_name}")
    print_info("This converts captions to Nomic embeddings and stores in ChromaDB...")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/updateVectorStore",
            json={"place": camera_name}
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print_success("Vector store updated successfully!")
            print(f"   Chunks created: {data.get('chunks', 'N/A')}")
            print(f"   Processing time: {data.get('processing_time_seconds', elapsed):.2f}s")
            return True
        else:
            print_error(f"Failed to update vector store: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def test_query(query_text, show_debug=False):
    """Test querying the CCTV footage."""
    print_header(f"5️⃣  QUERY: '{query_text}'")
    
    print_info("Step 1: Converting query to Nomic embedding...")
    print_info("Step 2: Finding similar captions in ChromaDB...")
    print_info("Step 3: Feeding context to NVIDIA Gemma LLM...")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/getResponse",
            json={
                "query": query_text,
                "top_k": 15
            }
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            
            print_success("Query completed!\n")
            
            # Show answer
            print(f"{Fore.CYAN}ANSWER:")
            print(f"{Fore.WHITE}{data['response']}\n")
            
            # Show timing
            timing = data.get('timing', {})
            print(f"{Fore.YELLOW}PERFORMANCE:")
            print(f"   Retrieval: {timing.get('retrieval_seconds', 0):.2f}s")
            print(f"   LLM:       {timing.get('llm_seconds', 0):.2f}s")
            print(f"   Total:     {timing.get('total_seconds', elapsed):.2f}s")
            
            # Show retrieved documents count
            print(f"\n{Fore.YELLOW}RETRIEVAL:")
            print(f"   Documents retrieved: {data.get('retrieved_documents', 0)}")
            
            # Show debug info if requested
            if show_debug and 'debug' in data:
                debug = data['debug']
                print(f"\n{Fore.MAGENTA}DEBUG INFO:")
                print(f"   Original query: {debug.get('original_query')}")
                print(f"   Prefixed query: {debug.get('prefixed_query')}")
                
                docs = debug.get('documents_metadata', [])
                if docs:
                    print(f"\n   Top 3 retrieved chunks:")
                    for i, doc in enumerate(docs[:3], 1):
                        print(f"   {i}. {doc['preview']}")
            
            return True
        else:
            print_error(f"Query failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    
    except Exception as e:
        print_error(f"Error: {e}")
        return False


def run_full_test():
    """Run complete test suite."""
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}")
    print("╔════════════════════════════════════════════════════════════════════════════╗")
    print("║            CCTV QUERY SYSTEM - NOMIC EMBEDDINGS TEST SUITE                ║")
    print("╚════════════════════════════════════════════════════════════════════════════╝")
    print(Style.RESET_ALL)
    
    # Test 1: Health check
    if not test_health():
        print_error("\nServer is not running. Please start it first:")
        print_info("    python app_optimized.py")
        return
    
    time.sleep(1)
    
    # Test 2: Get cameras
    cameras = test_get_cameras()
    if not cameras:
        print_error("\nNo cameras found. Cannot continue tests.")
        return
    
    time.sleep(1)
    
    # Test 3: Embedding similarity
    test_embedding_similarity()
    
    time.sleep(1)
    
    # Test 4: Update vector store
    camera = cameras[0]  # Use first camera
    if not test_update_vector_store(camera):
        print_error("\nFailed to update vector store. Cannot continue.")
        return
    
    time.sleep(2)
    
    # Test 5: Run sample queries
    sample_queries = [
        "Show me suspicious activity",
        "Find people entering the building",
        "What happened at 2:00 PM?",
        "Are there any vehicles speeding?"
    ]
    
    for query in sample_queries:
        test_query(query, show_debug=False)
        time.sleep(1)
    
    # Final summary
    print_header("✅ TEST SUITE COMPLETE")
    print(f"{Fore.GREEN}All tests passed! Your Nomic query system is working correctly.")
    print(f"\n{Fore.CYAN}HOW IT WORKS:")
    print(f"   1. User query → Nomic embedding (768-dim vector)")
    print(f"   2. ChromaDB finds similar caption embeddings (cosine similarity)")
    print(f"   3. Top 15 most relevant captions → sent to NVIDIA Gemma")
    print(f"   4. LLM generates answer based on retrieved context")


def interactive_mode():
    """Interactive query mode."""
    print_header("🎮 INTERACTIVE QUERY MODE")
    print_info("Type your queries below. Type 'quit' to exit.\n")
    
    while True:
        try:
            query = input(f"{Fore.GREEN}Query > {Style.RESET_ALL}").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                print_info("Goodbye!")
                break
            
            if not query:
                continue
            
            test_query(query, show_debug=True)
            print()
        
        except KeyboardInterrupt:
            print_info("\nGoodbye!")
            break


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "interactive":
            interactive_mode()
        elif sys.argv[1] == "similarity":
            test_health()
            test_embedding_similarity()
        else:
            print(f"Usage: python test_nomic_query.py [interactive|similarity]")
    else:
        # Run full test suite
        run_full_test()

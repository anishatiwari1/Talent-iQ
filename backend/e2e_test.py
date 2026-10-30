import asyncio
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.postgres import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.skill import Skill
from app.core.dependencies import get_current_user

# Test against the real DB? No, maybe it's better to just use the real db to test e2e, 
# or an isolated sqlite memory db. The prompt wants us to "Verify the actual PostgreSQL tables/records."
# So I should test against the real DB!

client = TestClient(app)

def run_test():
    # Insert test user into DB to satisfy foreign key constraints
    from app.database.postgres import SessionLocal
    db = SessionLocal()
    
    test_user = db.query(User).filter(User.email == "test@acme.com").first()
    if not test_user:
        test_user = User(email="test@acme.com", full_name="Test User", role="EMPLOYEE", is_active=True, password_hash="dummy")
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
    
    app.dependency_overrides[get_current_user] = lambda: test_user
    
    # Upload document
    resume_text = "I have 2 years of experience using React and TypeScript as a frontend developer. My expertise is frontend development. At Acme, I built a customer portal with React and TypeScript and improved its accessibility. I hold the AWS Cloud Practitioner certification, issued by Amazon."
    
    files = {
        "file": ("resume.txt", io.BytesIO(resume_text.encode("utf-8")), "text/plain")
    }
    data = {"document_type": "RESUME"}
    
    print("Uploading document...")
    upload_resp = client.post("/api/v1/documents/upload", files=files, data=data)
    assert upload_resp.status_code == 201, f"Upload failed: {upload_resp.text}"
    doc_id = upload_resp.json()["id"]
    print(f"Document uploaded with ID: {doc_id}")
    
    print("Processing document...")
    process_resp = client.post(f"/api/v1/documents/{doc_id}/process")
    assert process_resp.status_code == 200, f"Process failed: {process_resp.text}"
    result = process_resp.json()
    print("Process result:", result)
    
    # Verify extraction results
    assert result["llm_status"] == "LLM_SUCCESS"
    persisted = result["llm_persisted"]
    print("Persisted:", persisted)
    
    assert "React" in persisted["skills"] or "React" in persisted.get("manual_skills_preserved", [])
    assert "TypeScript" in persisted["skills"] or "TypeScript" in persisted.get("manual_skills_preserved", [])
    
    # Fallback behavior test
    print("Testing fallback behavior...")
    # Temporarily make Ollama unavailable
    import app.services.llm_extraction_service as llm_ext
    original_host = llm_ext.OLLAMA_HOST
    llm_ext.OLLAMA_HOST = "http://localhost:9999" # invalid host
    
    try:
        files = {
            "file": ("resume2.txt", io.BytesIO(resume_text.encode("utf-8")), "text/plain")
        }
        fallback_upload = client.post("/api/v1/documents/upload", files=files, data=data)
        doc2_id = fallback_upload.json()["id"]
        
        fallback_resp = client.post(f"/api/v1/documents/{doc2_id}/process")
        assert fallback_resp.status_code == 200
        fallback_result = fallback_resp.json()
        print("Fallback result:", fallback_result)
        
        assert fallback_result["llm_status"] == "LLM_UNAVAILABLE" or fallback_result["llm_status"] == "LLM_FAILED"
        # NLP should still succeed
        assert len(fallback_result["skills_extracted"]) > 0
    finally:
        llm_ext.OLLAMA_HOST = original_host

if __name__ == "__main__":
    run_test()
    print("E2E Test Passed")

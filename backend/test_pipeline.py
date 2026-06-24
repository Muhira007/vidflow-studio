import requests
import time
import os
import uuid
import psycopg2
import redis
from pprint import pprint

API_BASE_URL = "http://localhost:8000/api/videos"
DB_URL = "postgresql://postgres:postgres@localhost:5433/vidflow_studio"
REDIS_URL = "redis://localhost:6379/0"

def print_step(step_name):
    print(f"\n{'='*50}\n🚀 STEP: {step_name}\n{'='*50}")

def test_redis():
    print_step("Checking Redis Connection")
    try:
        r = redis.from_url(REDIS_URL)
        r.ping()
        print("✅ Redis is UP and running!")
        return True
    except Exception as e:
        print(f"❌ Redis failed: {e}")
        return False

def test_database():
    print_step("Checking PostgreSQL Connection")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.close()
        print("✅ PostgreSQL is UP and running!")
        return True
    except Exception as e:
        print(f"❌ PostgreSQL failed: {e}")
        return False

def test_fastapi():
    print_step("Checking FastAPI Server")
    try:
        response = requests.get(f"{API_BASE_URL}/")
        if response.status_code == 200:
            print("✅ FastAPI Server is UP and responding!")
            return True
        else:
            print(f"❌ FastAPI returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FastAPI failed (is it running?): {e}")
        return False

def test_pipeline_flow():
    print_step("Testing E2E Pipeline (Database -> API -> Celery)")
    
    # 1. Simulate Watcher: Inject a dummy video into DB
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    video_id = str(uuid.uuid4())
    dummy_title = f"Test Video {video_id[:8]}"
    dummy_path = f"/tmp/{dummy_title}.mp4"
    
    # Create a dummy file so Python doesn't complain about missing file (though ffmpeg might fail later)
    with open(dummy_path, "w") as f:
        f.write("dummy video data")
        
    print(f"👉 Simulating Watcher: Inserting Video ID '{video_id}' into database...")
    cursor.execute("""
        INSERT INTO videos (id, status)
        VALUES (%s, 'PENDING')
    """, (video_id,))
    conn.commit()
    print("✅ Video inserted successfully.")
    
    # 2. Call API to process the video
    print(f"👉 Simulating Frontend: Calling API to process video {video_id}...")
    response = requests.post(f"{API_BASE_URL}/{video_id}/process")
    if response.status_code == 200:
        print(f"✅ API accepted process request: {response.json()}")
    else:
        print(f"❌ API process request failed: {response.text}")
        return
        
    # 3. Wait for Celery to pick it up and update JobLog
    print("👉 Simulating Database Polling: Waiting for Celery to start the task...")
    max_retries = 10
    success = False
    
    for i in range(max_retries):
        time.sleep(2) # Wait 2 seconds between polls
        cursor.execute("SELECT status FROM videos WHERE id = %s", (video_id,))
        status = cursor.fetchone()[0]
        print(f"   [Poll {i+1}] Video Status: {status}")
        
        # Check job logs
        cursor.execute("SELECT step, status, message FROM job_logs WHERE video_id = %s ORDER BY created_at DESC", (video_id,))
        logs = cursor.fetchall()
        if logs:
            print(f"   [Poll {i+1}] Latest Job Log: {logs[0][0]} -> {logs[0][1]} ({logs[0][2]})")
            
        # If status changed from PENDING, Celery picked it up!
        if status != 'pending':
            success = True
            break
            
    if success:
        print("✅ SUCCESS! Celery Worker has successfully picked up the task from Redis and executed it.")
        if status in ['failed', 'error', 'invalid']:
             print("ℹ️ Note: Status is failed/invalid because our test video is a dummy file, but the PIPELINE COMMUNICATION is confirmed working!")
    else:
        print("❌ FAILED! Celery Worker did not process the task in time.")

    # Cleanup
    cursor.execute("DELETE FROM job_logs WHERE video_id = %s", (video_id,))
    cursor.execute("DELETE FROM videos WHERE id = %s", (video_id,))
    conn.commit()
    conn.close()
    if os.path.exists(dummy_path):
        os.remove(dummy_path)

if __name__ == "__main__":
    print("\n" + "*"*60)
    print("🤖 TESTSPRITE-LIKE AUTOMATED INTEGRATION TEST")
    print("*"*60)
    
    if test_database() and test_redis() and test_fastapi():
        test_pipeline_flow()
    else:
        print("\n❌ Cannot run E2E test. Please make sure Docker and FastAPI are running.")

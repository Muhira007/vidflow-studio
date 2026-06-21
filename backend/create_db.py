from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError
from app.database import Base, engine
from app.models import Video, JobLog
from app.config import settings

print("Checking if database exists...")
# Parse the database URL to get the base URL without the specific database name
db_url = settings.database_url
base_url = db_url.rsplit('/', 1)[0]
db_name = db_url.rsplit('/', 1)[1]

# Create an engine connected to the default 'postgres' database
default_engine = create_engine(f"{base_url}/postgres", isolation_level="AUTOCOMMIT")

try:
    with default_engine.connect() as conn:
        # Check if database exists
        result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"))
        if not result.fetchone():
            print(f"Database '{db_name}' does not exist. Creating it...")
            conn.execute(text(f"CREATE DATABASE {db_name}"))
            print(f"Database '{db_name}' created successfully!")
        else:
            print(f"Database '{db_name}' already exists.")
except Exception as e:
    print(f"Warning during database check/creation: {e}")

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Done!")

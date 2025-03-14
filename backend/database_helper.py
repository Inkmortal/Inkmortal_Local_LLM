#!/usr/bin/env python3
"""
Database helper script to check and fix the schema for the application.
This script can be run directly to add missing columns to the database.
"""
import os
import sys
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment variables or use default for development
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost/seadragon"
)

def check_and_update_schema():
    """Check if the database schema is up to date and update if needed."""
    print(f"Connecting to database: {DATABASE_URL}")
    
    # Create SQLAlchemy engine
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as connection:
            # Check if messages table has status column
            has_status_column = connection.execute(text("""
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'messages' AND column_name = 'status'
            """)).fetchone() is not None
            
            # Check if messages table has model column
            has_model_column = connection.execute(text("""
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'messages' AND column_name = 'model'
            """)).fetchone() is not None
            
            # Report status
            print(f"Status column exists: {has_status_column}")
            print(f"Model column exists: {has_model_column}")
            
            # Add missing columns if needed
            if not has_status_column:
                print("Adding status column to messages table...")
                connection.execute(text("ALTER TABLE messages ADD COLUMN status VARCHAR(50)"))
                print("Status column added.")
            
            if not has_model_column:
                print("Adding model column to messages table...")
                connection.execute(text("ALTER TABLE messages ADD COLUMN model VARCHAR(255)"))
                print("Model column added.")
            
            # Set default values for existing rows
            if not has_status_column or not has_model_column:
                connection.execute(text("UPDATE messages SET status = 'complete' WHERE status IS NULL"))
                connection.execute(text("UPDATE messages SET model = 'unknown' WHERE model IS NULL"))
                connection.commit()
                print("Default values set for existing messages.")
            
            # Verify that the columns now exist
            if not has_status_column or not has_model_column:
                columns = connection.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'messages' AND column_name IN ('status', 'model')
                """)).fetchall()
                
                print("\nVerification of added columns:")
                for column in columns:
                    print(f"  {column[0]}: {column[1]}")
            
            print("\nDatabase schema check complete.")
            if not has_status_column or not has_model_column:
                print("Schema has been updated.")
            else:
                print("Schema was already up to date.")
                
    except Exception as e:
        print(f"Error checking/updating schema: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = check_and_update_schema()
    sys.exit(0 if success else 1)
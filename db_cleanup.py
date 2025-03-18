#!/usr/bin/env python3
import psycopg2
from tqdm import tqdm
import sys
import time

# Database connection parameters
DB_USER = "inkmortal"
DB_PASSWORD = "postgres"
DB_HOST = "localhost"
DB_NAME = "seadragon"

def connect_to_db():
    """Connect to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            database=DB_NAME
        )
        conn.autocommit = False
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def count_records(cursor, table):
    """Count records in a table"""
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    return cursor.fetchone()[0]

def delete_with_progress(table_name, batch_size=5000):
    """Delete records from a table with progress bar"""
    conn = connect_to_db()
    cursor = conn.cursor()
    
    # Count total records
    total = count_records(cursor, table_name)
    if total == 0:
        print(f"No records in {table_name} to delete")
        conn.close()
        return
    
    print(f"Found {total} records in {table_name}")
    deleted = 0
    
    # Create progress bar
    with tqdm(total=total, desc=f"Deleting {table_name}", unit="records") as pbar:
        try:
            while deleted < total:
                # Delete in batches
                cursor.execute(f"DELETE FROM {table_name} WHERE ctid IN (SELECT ctid FROM {table_name} LIMIT {batch_size})")
                deleted_batch = cursor.rowcount
                if deleted_batch == 0:
                    break
                
                deleted += deleted_batch
                pbar.update(deleted_batch)
                
                # Commit each batch
                conn.commit()
                
                # Small delay to allow other DB operations and reduce load
                time.sleep(0.1)
            
            # Final commit
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"Error deleting from {table_name}: {e}")
        finally:
            conn.close()
    
    print(f"Deleted {deleted} records from {table_name}")

def main():
    print("Starting database cleanup...")
    
    # First delete messages (assuming foreign key constraints)
    delete_with_progress("messages")
    
    # Then delete conversations
    delete_with_progress("conversations")
    
    print("Database cleanup completed!")

if __name__ == "__main__":
    main()
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

def check_tables(cursor):
    """Check that tables exist and print their schema"""
    try:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Available tables: {', '.join(tables)}")
        
        # Check messages table
        if 'messages' in tables:
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'messages'
            """)
            print("\nMessages table columns:")
            for col in cursor.fetchall():
                print(f"  {col[0]} ({col[1]})")
        else:
            print("WARNING: 'messages' table not found!")
            
        # Check conversations table
        if 'conversations' in tables:
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'conversations'
            """)
            print("\nConversations table columns:")
            for col in cursor.fetchall():
                print(f"  {col[0]} ({col[1]})")
        else:
            print("WARNING: 'conversations' table not found!")
    except Exception as e:
        print(f"Error checking tables: {e}")

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

def check_constraints():
    """Check foreign key constraints"""
    conn = connect_to_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu 
                  ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY';
        """)
        
        print("\nForeign Key Constraints:")
        constraints = cursor.fetchall()
        if not constraints:
            print("  No foreign key constraints found")
        else:
            for constraint in constraints:
                print(f"  {constraint[1]}.{constraint[2]} references {constraint[3]}.{constraint[4]}")
    except Exception as e:
        print(f"Error checking constraints: {e}")
    finally:
        cursor.close()
        conn.close()

def main():
    print("Starting database cleanup...")
    
    # Check database structure first
    conn = connect_to_db()
    cursor = conn.cursor()
    check_tables(cursor)
    cursor.close()
    conn.close()
    
    # Check constraints
    check_constraints()
    
    # Ask for confirmation
    response = input("\nProceed with deletion? (y/n): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        return
    
    # First delete messages (due to foreign key constraints)
    delete_with_progress("messages")
    
    # Then delete conversations
    delete_with_progress("conversations")
    
    print("Database cleanup completed!")

if __name__ == "__main__":
    main()
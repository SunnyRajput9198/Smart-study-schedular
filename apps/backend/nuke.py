from sqlalchemy import text
from database import engine

def nuke_database():
    """
    Drops the entire 'public' schema and recreates it.
    This is the most definitive way to clear a PostgreSQL database.
    USE WITH EXTREME CAUTION.
    """
    print("🚨 WARNING: This will permanently delete ALL data in the 'public' schema.")
    confirm = input("Are you sure you want to continue? (yes/no): ")

    if confirm.lower() == 'yes':
        print("Connecting to the database to drop the public schema...")
        try:
            with engine.connect() as connection:
                # Use a transaction to perform the drop and create operations
                with connection.begin():
                    # This command drops everything (tables, constraints, etc.)
                    # in the public schema and then recreates it, empty.
                    connection.execute(text("DROP SCHEMA public CASCADE;"))
                    connection.execute(text("CREATE SCHEMA public;"))
                print("✅ Public schema dropped and recreated successfully.")
        except Exception as e:
            print(f"❌ An error occurred: {e}")
    else:
        print("Operation cancelled.")

if __name__ == "__main__":
    nuke_database()
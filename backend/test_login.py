from app.auth.jwt_handler import verify_password
import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, dbname='safevision', user='postgres', password='utkarsh4527')
cur = conn.cursor()
cur.execute("SELECT hashed_password FROM users WHERE email = 'somvanshiutkarsh7@gmail.com'")
row = cur.fetchone()
print('Hash in DB:', row[0])
print('Verify:', verify_password('Admin@123', row[0]))
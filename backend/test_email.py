"""
Run this to test email is working:
python test_email.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.alerts.email_sender import send_test_email

print("Sending test email...")
result = send_test_email()

if result:
    print("✅ Email sent successfully — check your inbox")
else:
    print("❌ Email failed — check .env credentials")

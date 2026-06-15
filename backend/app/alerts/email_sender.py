import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from datetime import datetime
import os
from app.core.config import settings


def get_db_recipients(severity: str = "all") -> list:
    """Get enabled recipients from DB, filtered by alert_type vs severity."""
    try:
        from app.database.database import SessionLocal
        from app.models.models import AlertRecipient
        db = SessionLocal()
        try:
            all_r = db.query(AlertRecipient).filter(AlertRecipient.is_enabled == True).all()
            result = []
            for r in all_r:
                if r.alert_type == "all":
                    result.append(r.email)
                elif r.alert_type == "critical" and severity.lower() == "critical":
                    result.append(r.email)
                elif r.alert_type == "high_critical" and severity.lower() in ("critical", "high"):
                    result.append(r.email)
            return result if result else settings.get_alert_recipients()
        finally:
            db.close()
    except Exception as e:
        print(f"DB recipients failed, using config: {e}")
        return settings.get_alert_recipients()


def send_violation_email(
    violation_type: str,
    camera_name: str,
    zone: str,
    confidence: float,
    severity: str,
    snapshot_path: str = None
):
    try:
        recipients = get_db_recipients(severity)
        if not recipients:
            print("No recipients configured")
            return False

        severity_color = {
            "critical": "#DC2626",
            "high":     "#E1261C",
            "medium":   "#D97706",
            "low":      "#16A34A",
        }.get(severity.lower(), "#E1261C")

        severity_bg = {
            "critical": "#FEE2E2",
            "high":     "#FEE2E2",
            "medium":   "#FEF3C7",
            "low":      "#DCFCE7",
        }.get(severity.lower(), "#FEE2E2")

        timestamp = datetime.now().strftime("%d %B %Y, %H:%M:%S IST")
        short_time = datetime.now().strftime("%H:%M:%S")

        msg = MIMEMultipart("related")
        msg["From"]    = settings.EMAIL_FROM
        msg["To"]      = ", ".join(recipients)
        msg["Subject"] = f"[SAFETY ALERT] {violation_type} — {camera_name} — {short_time}"

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:#0A0E1A;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#E1261C;font-size:22px;font-weight:700;
                                 letter-spacing:1px;">AMNS</span>
                    <span style="color:#9CA3AF;font-size:12px;margin-left:8px;">
                      ArcelorMittal Nippon Steel India
                    </span><br/>
                    <span style="color:#6B7280;font-size:11px;">
                      SafeVision AI — Safety Monitoring System
                    </span>
                  </td>
                  <td align="right">
                    <span style="background:#E1261C;color:#fff;padding:4px 12px;
                                 border-radius:4px;font-size:11px;font-weight:700;
                                 letter-spacing:1px;">LIVE ALERT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:{severity_color};padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:#ffffff;font-size:11px;font-weight:600;
                                letter-spacing:2px;text-transform:uppercase;
                                opacity:0.85;">Safety Violation Detected</div>
                    <div style="color:#ffffff;font-size:22px;font-weight:700;
                                margin-top:4px;">{violation_type}</div>
                  </td>
                  <td align="right">
                    <span style="background:rgba(255,255,255,0.20);color:#fff;
                                 padding:6px 14px;border-radius:20px;
                                 font-size:12px;font-weight:700;
                                 text-transform:uppercase;">{severity.upper()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:28px 32px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                <tr style="background:#F9FAFB;">
                  <td style="padding:10px 16px;font-size:11px;font-weight:700;
                              color:#6B7280;text-transform:uppercase;
                              letter-spacing:1px;border-bottom:1px solid #E5E7EB;"
                      width="40%">Field</td>
                  <td style="padding:10px 16px;font-size:11px;font-weight:700;
                              color:#6B7280;text-transform:uppercase;
                              letter-spacing:1px;border-bottom:1px solid #E5E7EB;">
                    Value</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#6B7280;
                              border-bottom:1px solid #F3F4F6;">Violation</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;
                              color:#111827;border-bottom:1px solid #F3F4F6;">
                    {violation_type}</td>
                </tr>
                <tr style="background:#FAFAFA;">
                  <td style="padding:12px 16px;font-size:13px;color:#6B7280;
                              border-bottom:1px solid #F3F4F6;">Camera</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;
                              color:#111827;border-bottom:1px solid #F3F4F6;">
                    {camera_name}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#6B7280;
                              border-bottom:1px solid #F3F4F6;">Zone</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;
                              color:#111827;border-bottom:1px solid #F3F4F6;">
                    {zone or 'N/A'}</td>
                </tr>
                <tr style="background:#FAFAFA;">
                  <td style="padding:12px 16px;font-size:13px;color:#6B7280;
                              border-bottom:1px solid #F3F4F6;">Time</td>
                  <td style="padding:12px 16px;font-size:13px;font-weight:600;
                              color:#111827;border-bottom:1px solid #F3F4F6;">
                    {timestamp}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;
                              color:#6B7280;">AI Confidence</td>
                  <td style="padding:12px 16px;">
                    <span style="background:{severity_bg};color:{severity_color};
                                 padding:3px 10px;border-radius:12px;
                                 font-size:13px;font-weight:700;">
                      {round(confidence * 100, 1)}%
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Snapshot -->
          {"<tr><td style='padding:16px 32px 8px;'><div style='font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;'>POV Snapshot</div><img src='cid:snapshot' style='width:100%;border-radius:8px;border:1px solid #E5E7EB;' alt='Violation Snapshot'/></td></tr>" if snapshot_path and os.path.exists(snapshot_path) else "<tr><td style='padding:16px 32px 8px;'><div style='background:#F9FAFB;border:1px dashed #D1D5DB;border-radius:8px;padding:20px;text-align:center;color:#9CA3AF;font-size:13px;'>No snapshot available</div></td></tr>"}

          <!-- Action Required -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#FEF2F2;border:1px solid #FECACA;
                            border-radius:8px;padding:16px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:13px;font-weight:700;color:#991B1B;
                                margin-bottom:6px;">⚠ Immediate Action Required</div>
                    <div style="font-size:12px;color:#B91C1C;line-height:1.6;">
                      A safety violation has been detected at <strong>{camera_name}</strong>.
                      Please dispatch safety personnel to <strong>{zone}</strong>
                      immediately and ensure compliance with PPE protocols.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0A0E1A;padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:#6B7280;font-size:11px;line-height:1.6;">
                      This alert was generated automatically by
                      <span style="color:#E1261C;font-weight:600;">SafeVision AI</span>
                      by AMNS.<br/>
                      Do not reply to this email.
                    </div>
                  </td>
                  <td align="right">
                    <div style="color:#374151;font-size:11px;">
                      AM/NS India<br/>
                      <span style="color:#6B7280;">Talegaon Plant</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

        # Attach HTML
        msg_alt = MIMEMultipart("alternative")
        msg_alt.attach(MIMEText(html, "html"))
        msg.attach(msg_alt)

        # Attach snapshot as inline image
        if snapshot_path and os.path.exists(snapshot_path):
            with open(snapshot_path, "rb") as f:
                img = MIMEImage(f.read())
                img.add_header("Content-ID", "<snapshot>")
                img.add_header("Content-Disposition", "inline",
                               filename=os.path.basename(snapshot_path))
                msg.attach(img)

        # Send
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, recipients, msg.as_string())

        print(f"✅ HTML Email sent — {violation_type} — {camera_name}")
        return True

    except Exception as e:
        print(f"❌ Email failed: {e}")
        return False


def send_test_email():
    return send_violation_email(
        violation_type="Safety Jacket Missing",
        camera_name="BC_Load Area",
        zone="BC Load Area Zone",
        confidence=0.914,
        severity="high",
        snapshot_path=None
    )

def send_invite_email(name: str, email: str, role: str, temp_password: str):
    """Send invite email with temporary password to new user."""
    try:
        msg = MIMEMultipart("related")
        msg["From"]    = settings.EMAIL_FROM
        msg["To"]      = email
        msg["Subject"] = "Welcome to SafeVision AI — Your Account is Ready"

        html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#0A0E1A;padding:22px 32px;">
            <span style="color:#E1261C;font-size:20px;font-weight:700;">AMNS</span>
            <span style="color:#9CA3AF;font-size:12px;margin-left:8px;">SafeVision AI</span>
            <div style="color:#6B7280;font-size:10px;margin-top:3px;">Safety Monitoring System</div>
          </td>
        </tr>
        <tr>
          <td style="background:#E1261C;padding:16px 32px;">
            <div style="color:#fff;font-size:20px;font-weight:700;">You\'ve been invited!</div>
            <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:3px;">Your SafeVision AI account has been created by an administrator.</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="font-size:14px;color:#374151;margin-bottom:12px;">Hello <strong>{name}</strong>,</p>
            <p style="font-size:13px;color:#6B7280;line-height:1.6;margin-bottom:20px;">
              An administrator has created a SafeVision AI account for you at AM/NS India Talegaon Plant.
              Use the credentials below to log in for the first time, then change your password immediately.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #E5E7EB;">
                  <div style="font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Login URL</div>
                  <div style="font-size:13px;color:#2563EB;font-weight:600;margin-top:3px;">http://localhost:8080/login</div>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #E5E7EB;">
                  <div style="font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Email</div>
                  <div style="font-size:13px;color:#111827;font-weight:600;margin-top:3px;">{email}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid #E5E7EB;">
                  <div style="font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Role</div>
                  <div style="font-size:13px;color:#111827;margin-top:3px;text-transform:capitalize;">{role.replace("_", " ")}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;">
                  <div style="font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Temporary Password</div>
                  <div style="font-size:22px;color:#E1261C;font-weight:700;font-family:monospace;letter-spacing:3px;margin-top:6px;">{temp_password}</div>
                  <div style="font-size:11px;color:#D97706;margin-top:6px;">⚠ Change this password after your first login via Settings → Security.</div>
                </td>
              </tr>
            </table>
            <p style="font-size:11px;color:#9CA3AF;margin-top:16px;">If you did not expect this invitation, please contact your IT administrator.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0A0E1A;padding:16px 32px;">
            <div style="color:#6B7280;font-size:10px;">SafeVision AI · AM/NS India · Talegaon Plant · Do not reply to this email</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

        msg_alt = MIMEMultipart("alternative")
        msg_alt.attach(MIMEText(html, "html"))
        msg.attach(msg_alt)

        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [email], msg.as_string())

        print(f"✅ Invite email sent to {email}")
        return True
    except Exception as e:
        print(f"❌ Invite email failed: {e}")
        return False
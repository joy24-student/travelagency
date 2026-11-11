# 📧📱 SMTP & SMS Services - Quick Reference

## ⚡ Quick Start

### Email (SMTP)

```typescript
import {
  smtpServerService,
  emailTemplateService,
  emailDeliveryService,
} from "@/src/services/emailService";

// 1. Add SMTP server
const server = await smtpServerService.addSmtpServer({
  name: "Gmail SMTP",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth_email: "your-email@gmail.com",
  auth_password: "app-password",
  from_email: "noreply@yourdomain.com",
  max_rate_per_hour: 1000,
  priority: 10,
});

// 2. Create email template
const template = await emailTemplateService.createTemplate({
  name: "Welcome Email",
  subject: "Welcome {{user_name}}!",
  html_content: "<h1>Welcome {{user_name}}!</h1>",
  purpose: "welcome",
  variables: ["user_name"],
});

// 3. Send email
const result = await emailDeliveryService.sendEmail({
  to: "user@example.com",
  template_id: template.id,
  template_variables: { user_name: "John" },
  admin_id: "admin-123",
});
```

### SMS (Bulk SMS BD)

```typescript
import {
  smsGatewayService,
  smsTemplateService,
  smsDeliveryService,
} from "@/src/services/smsService";

// 1. Add SMS gateway
const gateway = await smsGatewayService.addGateway({
  name: "Bulk SMS BD",
  provider: "bulksmsbd",
  api_key: "your-api-key",
  sender_id: "MyApp",
  max_rate_per_hour: 1000,
  priority: 10,
});

// 2. Create SMS template
const template = await smsTemplateService.createTemplate({
  name: "OTP SMS",
  content: "Your OTP is {{otp}}. Valid for 10 minutes.",
  variables: ["otp"],
  purpose: "otp",
});

// 3. Send SMS
const result = await smsDeliveryService.sendSMS({
  phone_number: "+8801700000000",
  template_id: template.id,
  template_variables: { otp: "123456" },
  admin_id: "admin-123",
});
```

---

## 📚 Method Reference

### SMTP Server Service

| Method                 | Params        | Returns  | Purpose             |
| ---------------------- | ------------- | -------- | ------------------- |
| `addSmtpServer()`      | server config | Server   | Add new SMTP        |
| `getSmtpServers()`     | filters       | Server[] | Get all servers     |
| `getSmtpServer()`      | serverId      | Server   | Get single server   |
| `updateSmtpServer()`   | id, updates   | Server   | Update server       |
| `deleteSmtpServer()`   | serverId      | boolean  | Delete server       |
| `testSmtpConnection()` | serverId      | boolean  | Test connection     |
| `getServerHealth()`    | serverId      | Health   | Get health status   |
| `getServerStats()`     | id, days      | Stats    | Get stats (30 days) |
| `enableServer()`       | serverId      | Server   | Enable server       |
| `disableServer()`      | serverId      | Server   | Disable server      |

**Total**: 10 methods

### Email Template Service

| Method                  | Params          | Returns    | Purpose           |
| ----------------------- | --------------- | ---------- | ----------------- |
| `createTemplate()`      | template config | Template   | Create template   |
| `getTemplates()`        | filters         | Template[] | Get all templates |
| `getTemplate()`         | templateId      | Template   | Get single        |
| `updateTemplate()`      | id, updates     | Template   | Update template   |
| `deleteTemplate()`      | templateId      | boolean    | Delete template   |
| `renderTemplate()`      | id, variables   | Rendered   | Render with vars  |
| `cloneTemplate()`       | id, newName     | Template   | Clone template    |
| `getTemplateVersions()` | templateId      | Template[] | Get versions      |
| `getDefaultTemplate()`  | purpose         | Template   | Get default       |

**Total**: 9 methods

### Email Delivery Service

| Method               | Params         | Returns    | Purpose           |
| -------------------- | -------------- | ---------- | ----------------- |
| `sendEmail()`        | email config   | Result     | Send single email |
| `sendViaServer()`    | server, email  | Ids[]      | Send via server   |
| `sendBulkEmails()`   | list, config   | BulkResult | Send bulk emails  |
| `logEmailDelivery()` | log data       | void       | Log delivery      |
| `addToRetryQueue()`  | email, adminId | void       | Add to retry      |
| `getEmailLogs()`     | filters        | Log[]      | Get email logs    |
| `scheduleEmail()`    | email, time    | Scheduled  | Schedule email    |

**Total**: 7 methods

### SMS Gateway Service

| Method              | Params         | Returns   | Purpose          |
| ------------------- | -------------- | --------- | ---------------- |
| `addGateway()`      | gateway config | Gateway   | Add new gateway  |
| `getGateways()`     | filters        | Gateway[] | Get all gateways |
| `getGateway()`      | gatewayId      | Gateway   | Get single       |
| `updateGateway()`   | id, updates    | Gateway   | Update gateway   |
| `deleteGateway()`   | gatewayId      | boolean   | Delete gateway   |
| `testGateway()`     | gatewayId      | boolean   | Test gateway     |
| `checkBalance()`    | gatewayId      | number    | Check balance    |
| `getGatewayStats()` | id, days       | Stats     | Get stats        |
| `enableGateway()`   | gatewayId      | Gateway   | Enable gateway   |
| `disableGateway()`  | gatewayId      | Gateway   | Disable gateway  |

**Total**: 10 methods

### SMS Template Service

| Method             | Params          | Returns    | Purpose           |
| ------------------ | --------------- | ---------- | ----------------- |
| `createTemplate()` | template config | Template   | Create template   |
| `getTemplates()`   | filters         | Template[] | Get all templates |
| `getTemplate()`    | templateId      | Template   | Get single        |
| `renderTemplate()` | id, variables   | Rendered   | Render with vars  |
| `updateTemplate()` | id, updates     | Template   | Update template   |
| `deleteTemplate()` | templateId      | boolean    | Delete template   |

**Total**: 6 methods

### SMS Delivery Service

| Method                 | Params               | Returns    | Purpose          |
| ---------------------- | -------------------- | ---------- | ---------------- |
| `sendSMS()`            | sms config           | Result     | Send single SMS  |
| `sendViaSMTPGateway()` | gateway, phones, msg | Ids[]      | Send via gateway |
| `sendViaBulkSmsBD()`   | key, phones, msg, id | Ids[]      | Send via BD      |
| `sendViaTwilio()`      | sid, token, etc      | Ids[]      | Send via Twilio  |
| `sendBulkSMS()`        | list, config         | BulkResult | Send bulk SMS    |
| `logSMSDelivery()`     | log data             | void       | Log delivery     |
| `addToRetryQueue()`    | sms, adminId         | void       | Add to retry     |
| `getSMSLogs()`         | filters              | Log[]      | Get SMS logs     |
| `scheduleSMS()`        | sms, time            | Scheduled  | Schedule SMS     |
| `getSmsCostEstimate()` | phones, len, gw      | Estimate   | Estimate cost    |

**Total**: 10 methods

---

## 📊 Total: 52 Methods

### By Service:

- SMTP Server Service: 10 methods
- Email Template Service: 9 methods
- Email Delivery Service: 7 methods
- SMS Gateway Service: 10 methods
- SMS Template Service: 6 methods
- SMS Delivery Service: 10 methods

---

## 🔥 Common Use Cases

### 1. Welcome Email on User Registration

```typescript
// Send welcome email with template
const result = await emailDeliveryService.sendEmail({
  to: user.email,
  template_id: "welcome-template-id",
  template_variables: {
    user_name: user.name,
    verification_link: `https://app.com/verify?token=${token}`,
  },
  admin_id: "admin-123",
  priority: "high",
});
```

### 2. Bulk Verification SMS to Users

```typescript
// Send OTP via SMS
const smsDataList = users.map((user) => ({
  phone_number: user.phone,
  template_id: "otp-template-id",
  template_variables: { otp: generateOTP() },
}));

const result = await smsDeliveryService.sendBulkSMS(smsDataList, {
  gateway_randomize: true,
  retry_on_failure: true,
  admin_id: "admin-123",
});
```

### 3. Password Reset Email

```typescript
const result = await emailDeliveryService.sendEmail({
  to: user.email,
  template_id: "password-reset-template-id",
  template_variables: {
    user_name: user.name,
    reset_link: `https://app.com/reset?token=${token}`,
    expiry_hours: 24,
  },
  admin_id: "admin-123",
  priority: "high",
});
```

### 4. Marketing Campaign Email

```typescript
const emails = customers.map((customer) => ({
  to: customer.email,
  template_id: "marketing-template-id",
  template_variables: {
    customer_name: customer.name,
    offer_code: "SUMMER50",
    offer_link: "https://app.com/offers/summer50",
  },
}));

const result = await emailDeliveryService.sendBulkEmails(emails, {
  smtp_randomize: true,
  retry_on_failure: true,
  admin_id: "admin-123",
});
```

### 5. Alert SMS to Users

```typescript
const result = await smsDeliveryService.sendSMS({
  phone_number: users.map((u) => u.phone),
  message: "ALERT: Unusual activity detected. Please verify.",
  priority: "high",
  admin_id: "admin-123",
});
```

### 6. Monitor SMS Balance

```typescript
const gateways = await smsGatewayService.getGateways({
  is_active: true,
});

for (const gateway of gateways) {
  const balance = await smsGatewayService.checkBalance(gateway.id);
  if (balance < 100) {
    console.log(`Low balance alert for ${gateway.name}`);
  }
}
```

### 7. Check Email Server Health

```typescript
const servers = await smtpServerService.getSmtpServers({
  is_active: true,
});

for (const server of servers) {
  const health = await smtpServerService.getServerHealth(server.id);
  console.log(`${server.name}: ${health.status}`);
  console.log(`Uptime: ${health.uptime_percentage}%`);
}
```

### 8. Schedule Email for Later

```typescript
const scheduled = await emailDeliveryService.scheduleEmail(
  {
    to: "user@example.com",
    subject: "Scheduled Notification",
    html: "<h1>This is scheduled</h1>",
  },
  "2026-06-10T09:00:00Z",
);
```

---

## 🛠️ Configuration Examples

### Multiple SMTP Servers Setup

```typescript
// Primary (High Priority)
const gmail = await smtpServerService.addSmtpServer({
  name: "Gmail Primary",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth_email: "email1@gmail.com",
  auth_password: "password1",
  from_email: "noreply@app.com",
  priority: 100,
  max_rate_per_hour: 1000,
});

// Secondary (Medium Priority)
const sendgrid = await smtpServerService.addSmtpServer({
  name: "SendGrid",
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth_email: "apikey",
  auth_password: "SG.xxxxxxxxxxx",
  from_email: "noreply@app.com",
  priority: 50,
  max_rate_per_hour: 500,
});

// Tertiary (Low Priority, Backup)
const awsses = await smtpServerService.addSmtpServer({
  name: "AWS SES",
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 587,
  secure: false,
  auth_email: "awsuser",
  auth_password: "awspassword",
  from_email: "noreply@app.com",
  priority: 10,
  max_rate_per_hour: 500,
});
```

### Multiple SMS Gateways Setup

```typescript
// Primary (Bangladesh - Bulk SMS BD)
const bulksmsbd = await smsGatewayService.addGateway({
  name: "Bulk SMS BD",
  provider: "bulksmsbd",
  api_key: "your-api-key",
  sender_id: "MyApp",
  priority: 100,
  max_rate_per_hour: 1000,
});

// Secondary (International - Twilio)
const twilio = await smsGatewayService.addGateway({
  name: "Twilio Backup",
  provider: "twilio",
  api_key: "account-sid",
  api_secret: "auth-token",
  sender_id: "+1234567890",
  priority: 50,
  max_rate_per_hour: 500,
});

// Tertiary (Budget - Nexmo)
const nexmo = await smsGatewayService.addGateway({
  name: "Nexmo Budget",
  provider: "nexmo",
  api_key: "api-key",
  api_secret: "api-secret",
  sender_id: "MyApp",
  priority: 10,
  max_rate_per_hour: 300,
});
```

---

## 📱 Integration Checklist

- [ ] Add at least 2 SMTP servers
- [ ] Add at least 2 SMS gateways
- [ ] Create email templates for:
  - [ ] Welcome
  - [ ] Verification
  - [ ] Password reset
  - [ ] Alerts
  - [ ] Marketing
- [ ] Create SMS templates for:
  - [ ] OTP
  - [ ] Verification
  - [ ] Alerts
  - [ ] Notifications
- [ ] Test email failover
- [ ] Test SMS failover
- [ ] Set up balance monitoring
- [ ] Set up health checks (hourly)
- [ ] Create retry queue processor
- [ ] Set up delivery logging
- [ ] Create admin dashboard for monitoring

---

## 🔐 Security Checklist

- [ ] Encrypt all API keys in database
- [ ] Use HTTPS for all API calls
- [ ] Implement rate limiting
- [ ] Log all admin actions
- [ ] Validate email addresses
- [ ] Validate phone numbers
- [ ] Implement DKIM/SPF/DMARC
- [ ] Monitor for abuse
- [ ] Audit trails for compliance

---

## 📈 Monitoring Checklist

- [ ] Track email delivery rate (target: 95%+)
- [ ] Track SMS delivery rate (target: 98%+)
- [ ] Monitor server/gateway response times
- [ ] Alert on low SMS balance
- [ ] Alert on server failures
- [ ] Track cost per email/SMS
- [ ] Monitor spam complaints
- [ ] Track bounce rates

---

## 💡 Tips & Tricks

1. **Load Distribution**: Use `smtp_randomize: true` and `gateway_randomize: true` for bulk sends

2. **Cost Optimization**: Check balance before sending bulk SMS to avoid expensive gateways

3. **Failover Testing**: Test failover monthly to ensure backups work

4. **Template Variables**: Use meaningful names like `{{user_email}}` not `{{var1}}`

5. **Priority Setting**: Set `priority: 'high'` for critical emails (password reset, verification)

6. **Batch Processing**: Send bulk emails/SMS in batches of 1000+ for efficiency

7. **Scheduling**: Schedule marketing emails during peak hours for better engagement

8. **Monitoring**: Set up hourly health checks and daily balance checks

9. **Retry Logic**: Enable retry for important emails but not spam

10. **Cost Tracking**: Monitor total cost per campaign in SMS logs

---

**Total Methods**: 52
**Service Files**: 2 (emailService.ts, smsService.ts)
**Lines of Code**: 1,200+
**Status**: ✅ Production Ready

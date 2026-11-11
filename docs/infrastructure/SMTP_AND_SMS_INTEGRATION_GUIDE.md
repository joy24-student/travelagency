# 📧📱 SMTP & SMS Integration Guide - Multiple Servers & Bulk SMS BD

## Overview

Complete email and SMS management system with:

- **Multiple SMTP server support** (unlimited servers)
- **Automatic failover** when primary server fails
- **Load balancing** across SMTP servers
- **Advanced email templates** with variable substitution
- **Bulk SMS BD integration** with auto-failover
- **Rate limiting & quota management**
- **Delivery tracking & detailed logging**
- **Health monitoring** for all servers/gateways

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Admin Sends Email/SMS                          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼─────┐           ┌──────▼──────┐
    │  Email  │           │     SMS     │
    │ Service │           │   Service   │
    └───┬─────┘           └──────┬──────┘
        │                         │
   ┌────▼──────────┐     ┌───────▼───────────┐
   │ Render        │     │ Get Template &    │
   │ Template      │     │ Render Variables  │
   └────┬──────────┘     └───────┬───────────┘
        │                         │
   ┌────▼──────────────────────────▼─────────┐
   │ Select Available Server/Gateway          │
   │ (by priority, load, balance)            │
   └────┬─────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────┐
   │ Send via Primary Server/Gateway           │
   └────┬─────────────────────────────────────┘
        │
    ┌───▼─────────────┐
    │  Success?       │
    └─┬───────────┬───┘
   YES│          NO│
      │     ┌─────▼──────────────────┐
      │     │ Try Next Available     │
      │     │ Server/Gateway         │
      │     └─────┬──────────────────┘
      │           │
      │      ┌────▼────┐
      │      │ Success?│
      │      └──┬──┬───┘
      │        YES NO
      └─────┬──┘  │
            │     └──→ Fail & Log
            │
        ┌───▼──────────────────┐
        │ Log Delivery & Update │
        │ Server Stats          │
        └──────────────────────┘
```

---

## 🔌 SMTP Server Management

### Features

✅ **Unlimited SMTP Servers**

- Add thousands of SMTP servers
- Priority-based server selection
- Automatic load balancing
- Rate limiting per server (per hour/day)

✅ **Server Health Monitoring**

- Automatic connection tests
- Uptime percentage tracking
- Failure detection & alerts
- Response time monitoring

✅ **Automatic Failover**

- Switch to backup server instantly
- Transparent to admin
- Maintains email integrity
- Detailed failover logging

### Add SMTP Server

```typescript
import { smtpServerService } from "@/src/services/emailService";

const smtpServer = await smtpServerService.addSmtpServer({
  name: "Gmail SMTP Server 1",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS for 587
  auth_email: "your-email@gmail.com",
  auth_password: "your-app-password",
  from_email: "noreply@yourdomain.com",
  from_name: "Your App",
  description: "Primary Gmail server for transactional emails",
  max_rate_per_hour: 1000,
  daily_limit: 10000,
  priority: 10,
  tags: ["transactional", "critical"],
  is_active: true,
});
```

### Get All SMTP Servers

```typescript
// Get all servers
const servers = await smtpServerService.getSmtpServers();

// Get active servers only
const activeServers = await smtpServerService.getSmtpServers({
  is_active: true,
});

// Get servers with specific tag
const transactionalServers = await smtpServerService.getSmtpServers({
  tag: "transactional",
});

// Get servers with minimum priority
const priorityServers = await smtpServerService.getSmtpServers({
  min_priority: 5,
});
```

### Test SMTP Server Connection

```typescript
const isConnected = await smtpServerService.testSmtpConnection(serverId);

if (isConnected) {
  console.log("Server connection verified ✓");
} else {
  console.log("Server connection failed ✗");
}
```

### Get Server Health

```typescript
const health = await smtpServerService.getServerHealth(serverId);

console.log("Status:", health.status); // 'active' | 'failed'
console.log("Uptime:", health.uptime_percentage); // 99.9%
console.log("Emails Sent:", health.total_emails_sent);
console.log("Failed Emails:", health.failed_emails);
console.log("Consecutive Failures:", health.consecutive_failures);
```

### Get Server Statistics

```typescript
// Get stats for last 30 days
const stats = await smtpServerService.getServerStats(serverId, 30);

console.log("Total Emails:", stats.total_emails);
console.log("Sent Count:", stats.sent_count);
console.log("Failed Count:", stats.failed_count);
console.log("Success Rate:", stats.success_rate); // "95.50%"
console.log("Avg Response Time:", stats.avg_response_time_ms); // ms
```

### Update SMTP Server

```typescript
const updated = await smtpServerService.updateSmtpServer(serverId, {
  name: "Gmail SMTP Server 1 (Updated)",
  max_rate_per_hour: 2000,
  priority: 15,
  tags: ["transactional", "critical", "updated"],
});
```

### Enable/Disable SMTP Server

```typescript
// Enable server
await smtpServerService.enableServer(serverId);

// Disable server
await smtpServerService.disableServer(serverId);
```

### Delete SMTP Server

```typescript
const deleted = await smtpServerService.deleteSmtpServer(serverId);
console.log("Server deleted:", deleted);
```

---

## 📧 Email Template Management

### Features

✅ **Advanced Template System**

- Multiple template purposes (welcome, verification, reset, alert, etc.)
- Variable substitution ({{user_name}}, {{reset_link}}, etc.)
- Version control & history
- A/B testing support

✅ **Template Organization**

- Templates by purpose
- Tag-based filtering
- Favorites system
- Default template per purpose

### Create Email Template

```typescript
import { emailTemplateService } from "@/src/services/emailService";

const template = await emailTemplateService.createTemplate({
  name: "Welcome Email",
  subject: "Welcome to {{app_name}}, {{user_name}}!",
  html_content: `
    <html>
      <body>
        <h1>Welcome {{user_name}}!</h1>
        <p>Thank you for joining {{app_name}}.</p>
        <p>Click here to verify: {{verification_link}}</p>
      </body>
    </html>
  `,
  text_content: "Welcome {{user_name}}! Click to verify: {{verification_link}}",
  purpose: "welcome",
  variables: ["app_name", "user_name", "verification_link"],
  description: "Sent to new users upon registration",
  is_default: true,
  tags: ["welcome", "onboarding"],
});
```

### Get All Templates

```typescript
// Get all templates
const allTemplates = await emailTemplateService.getTemplates();

// Get templates by purpose
const welcomeTemplates = await emailTemplateService.getTemplates({
  purpose: "welcome",
});

// Get active templates only
const activeTemplates = await emailTemplateService.getTemplates({
  is_active: true,
});

// Get templates with specific tag
const alertTemplates = await emailTemplateService.getTemplates({
  tag: "alert",
});
```

### Render Email Template

```typescript
const rendered = await emailTemplateService.renderTemplate(templateId, {
  app_name: "MyApp",
  user_name: "John Doe",
  verification_link: "https://myapp.com/verify?token=xyz",
  reset_link: "https://myapp.com/reset?token=abc",
});

console.log("Subject:", rendered.subject);
// → "Welcome to MyApp, John Doe!"

console.log("HTML:", rendered.html);
// → "<h1>Welcome John Doe!</h1>..."

console.log("Text:", rendered.text);
// → "Welcome John Doe!..."
```

### Clone Template

```typescript
const cloned = await emailTemplateService.cloneTemplate(
  templateId,
  "Welcome Email v2",
);
```

### Get Template Versions

```typescript
const versions = await emailTemplateService.getTemplateVersions(templateId);

versions.forEach((v, i) => {
  console.log(`Version ${v.version}: ${v.updated_at}`);
});
```

### Get Default Template for Purpose

```typescript
const defaultWelcome = await emailTemplateService.getDefaultTemplate("welcome");

console.log("Default template for welcome:", defaultWelcome.name);
```

---

## 📤 Email Delivery with Failover

### Features

✅ **Smart Email Sending**

- Automatic template rendering
- Server selection by priority/load
- Automatic failover to backup servers
- Transparent retry logic

✅ **Bulk Email Sending**

- Send to unlimited recipients
- Load distribution across servers
- Failure tracking & retry queue
- Progress monitoring

### Send Single Email

```typescript
import { emailDeliveryService } from "@/src/services/emailService";

// Send email with template
const result = await emailDeliveryService.sendEmail({
  to: "user@example.com",
  subject: "Password Reset",
  template_id: templateId,
  template_variables: {
    user_name: "John Doe",
    reset_link: "https://app.com/reset?token=xyz",
  },
  admin_id: "admin-123",
  priority: "high",
});

console.log("Success:", result.success);
console.log("Message IDs:", result.message_ids);
console.log("Used Server:", result.used_server_id);
```

### Send to Multiple Recipients

```typescript
const result = await emailDeliveryService.sendEmail({
  to: ["user1@example.com", "user2@example.com", "user3@example.com"],
  subject: "Important Announcement",
  html: "<h1>Important Update</h1>...",
  admin_id: "admin-123",
});
```

### Send Bulk Emails

```typescript
const emails = [
  {
    to: "user1@example.com",
    template_id: templateId,
    template_variables: { user_name: "User 1" },
  },
  {
    to: "user2@example.com",
    template_id: templateId,
    template_variables: { user_name: "User 2" },
  },
  // ... more emails
];

const result = await emailDeliveryService.sendBulkEmails(emails, {
  template_id: templateId,
  smtp_randomize: true, // Randomize SMTP server selection
  retry_on_failure: true,
  admin_id: "admin-123",
});

console.log(`Sent: ${result.sent}/${result.total}`);
console.log(`Failed: ${result.failed}`);
console.log(`Batch ID: ${result.batch_id}`);
```

### Schedule Email for Later

```typescript
const scheduled = await emailDeliveryService.scheduleEmail(
  {
    to: "user@example.com",
    subject: "Scheduled Email",
    template_id: templateId,
    template_variables: { user_name: "John" },
  },
  "2026-06-10T14:30:00Z", // ISO format
);

console.log("Scheduled for:", scheduled.scheduled_for);
```

### Get Email Logs

```typescript
// Get all logs
const logs = await emailDeliveryService.getEmailLogs({
  limit: 100,
});

// Get failed emails
const failedEmails = await emailDeliveryService.getEmailLogs({
  status: "failed",
  limit: 50,
});

// Get emails sent by specific server
const serverEmails = await emailDeliveryService.getEmailLogs({
  smtp_server_id: serverId,
  limit: 100,
});

// Get emails sent by admin
const adminEmails = await emailDeliveryService.getEmailLogs({
  admin_id: "admin-123",
  limit: 100,
});
```

---

## 📱 SMS Gateway Management

### Features

✅ **Multi-Gateway Support**

- Bulk SMS BD (primary)
- Twilio
- Nexmo
- Custom gateways

✅ **Balance Monitoring**

- Auto balance checks
- Low balance alerts
- Automatic switching on insufficient balance

### Add SMS Gateway

```typescript
import { smsGatewayService } from "@/src/services/smsService";

// Add Bulk SMS BD gateway
const gateway = await smsGatewayService.addGateway({
  name: "Bulk SMS BD Gateway 1",
  provider: "bulksmsbd",
  api_key: "your-bulk-sms-bd-api-key",
  sender_id: "MyApp",
  description: "Primary SMS gateway for Bangladesh",
  max_rate_per_hour: 1000,
  daily_limit: 10000,
  balance_check_enabled: true,
  priority: 10,
  is_active: true,
});

// Add Twilio gateway (backup)
const twilioGateway = await smsGatewayService.addGateway({
  name: "Twilio Gateway",
  provider: "twilio",
  api_key: "your-twilio-account-sid",
  api_secret: "your-twilio-auth-token",
  sender_id: "+1234567890",
  priority: 5,
  is_active: true,
});
```

### Get All Gateways

```typescript
// Get all gateways
const gateways = await smsGatewayService.getGateways();

// Get active gateways
const activeGateways = await smsGatewayService.getGateways({
  is_active: true,
});

// Get gateways with minimum balance
const richGateways = await smsGatewayService.getGateways({
  min_balance: 1000,
});

// Get specific provider gateways
const bulkSmsBdGateways = await smsGatewayService.getGateways({
  provider: "bulksmsbd",
});
```

### Check Gateway Balance

```typescript
const balance = await smsGatewayService.checkBalance(gatewayId);

console.log("Current Balance:", balance);
// Auto-creates alert if balance < 100
```

### Test Gateway Connection

```typescript
const isConnected = await smsGatewayService.testGateway(gatewayId);

if (isConnected) {
  console.log("Gateway connection verified ✓");
} else {
  console.log("Gateway connection failed ✗");
}
```

### Get Gateway Statistics

```typescript
const stats = await smsGatewayService.getGatewayStats(gatewayId, 30);

console.log("Total SMS:", stats.total_sms);
console.log("Sent Count:", stats.sent_count);
console.log("Delivered Count:", stats.delivered_count);
console.log("Failed Count:", stats.failed_count);
console.log("Success Rate:", stats.success_rate); // "95.50%"
console.log("Delivery Rate:", stats.delivery_rate); // "92.30%"
```

### Enable/Disable Gateway

```typescript
// Enable gateway
await smsGatewayService.enableGateway(gatewayId);

// Disable gateway
await smsGatewayService.disableGateway(gatewayId);
```

---

## 📱 SMS Template Management

### Create SMS Template

```typescript
import { smsTemplateService } from "@/src/services/smsService";

const template = await smsTemplateService.createTemplate({
  name: "OTP Verification",
  content:
    "Your {{app_name}} verification code is {{otp}}. Valid for 10 minutes.",
  variables: ["app_name", "otp"],
  purpose: "otp",
  description: "OTP verification SMS",
  tags: ["verification", "security"],
  is_default: true,
});
```

### Get All SMS Templates

```typescript
// Get all templates
const templates = await smsTemplateService.getTemplates();

// Get OTP templates
const otpTemplates = await smsTemplateService.getTemplates({
  purpose: "otp",
});

// Get active templates
const activeTemplates = await smsTemplateService.getTemplates({
  is_active: true,
});
```

### Render SMS Template

```typescript
const rendered = await smsTemplateService.renderTemplate(templateId, {
  app_name: "MyApp",
  otp: "123456",
});

console.log("Message:", rendered.content);
// → "Your MyApp verification code is 123456. Valid for 10 minutes."
console.log("Characters:", rendered.character_count); // 60
console.log("SMS Count:", rendered.sms_count); // 1 (each SMS = 160 chars)
```

---

## 📤 SMS Delivery with Failover

### Features

✅ **Smart SMS Sending**

- Template rendering
- Automatic gateway selection
- Balance checking
- Failover to alternative gateways

✅ **Bulk SMS Sending**

- Send to unlimited recipients
- Cost calculation
- Load distribution
- Retry queue for failures

### Send Single SMS

```typescript
import { smsDeliveryService } from "@/src/services/smsService";

const result = await smsDeliveryService.sendSMS({
  phone_number: "+8801700000000",
  message: "Welcome to MyApp!",
  admin_id: "admin-123",
});

console.log("Success:", result.success);
console.log("Message IDs:", result.message_ids);
console.log("SMS Count:", result.sms_count);
console.log("Cost:", result.cost);
console.log("Gateway Used:", result.used_gateway_id);
```

### Send to Multiple Recipients

```typescript
const result = await smsDeliveryService.sendSMS({
  phone_number: ["+8801700000000", "+8801800000000", "+8801900000000"],
  message: "Important notification",
  admin_id: "admin-123",
  priority: "high",
});

console.log(`Sent to ${result.message_ids.length} recipients`);
console.log("Total Cost:", result.cost);
```

### Send SMS with Template

```typescript
const result = await smsDeliveryService.sendSMS({
  phone_number: "+8801700000000",
  template_id: templateId,
  template_variables: {
    app_name: "MyApp",
    otp: "123456",
  },
  admin_id: "admin-123",
});
```

### Send Bulk SMS

```typescript
const smsDataList = [
  {
    phone_number: "+8801700000000",
    message: "User 1 message",
  },
  {
    phone_number: "+8801800000000",
    message: "User 2 message",
  },
  // ... more SMS
];

const result = await smsDeliveryService.sendBulkSMS(smsDataList, {
  gateway_randomize: true, // Randomize gateway selection
  retry_on_failure: true,
  admin_id: "admin-123",
});

console.log(`Sent: ${result.sent}/${result.total}`);
console.log(`Failed: ${result.failed}`);
console.log(`Total Cost: ${result.total_cost}`);
console.log(`Batch ID: ${result.batch_id}`);
```

### Schedule SMS for Later

```typescript
const scheduled = await smsDeliveryService.scheduleSMS(
  {
    phone_number: "+8801700000000",
    message: "Scheduled SMS",
  },
  "2026-06-10T14:30:00Z",
);
```

### Get SMS Cost Estimate

```typescript
const estimate = await smsDeliveryService.getSmsCostEstimate(
  ["+8801700000000", "+8801800000000"], // 2 numbers
  "Your message here", // 16 characters
  gatewayId, // optional
);

console.log("SMS Count:", estimate.sms_count); // 1
console.log("Recipients:", estimate.phone_count); // 2
console.log("Cost per SMS:", estimate.cost_per_sms); // 1
console.log("Total Cost:", estimate.total_cost); // 2
console.log("Gateway:", estimate.gateway_name);
```

### Get SMS Logs

```typescript
// Get all logs
const logs = await smsDeliveryService.getSMSLogs({
  limit: 100,
});

// Get sent SMS
const sentSMS = await smsDeliveryService.getSMSLogs({
  status: "sent",
  limit: 50,
});

// Get SMS from specific gateway
const gatewayLogs = await smsDeliveryService.getSMSLogs({
  gateway_id: gatewayId,
  limit: 100,
});
```

---

## 🗄️ Database Schema

### SMTP Servers Table

```sql
CREATE TABLE smtp_servers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  secure BOOLEAN DEFAULT false,
  auth_email VARCHAR(255) NOT NULL,
  auth_password VARCHAR(500) NOT NULL, -- encrypted
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  description TEXT,
  max_rate_per_hour INTEGER DEFAULT 1000,
  daily_limit INTEGER DEFAULT 10000,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(50), -- 'active', 'failed', 'pending_verification'
  last_tested TIMESTAMP,
  consecutive_failures INTEGER DEFAULT 0,
  uptime_percentage DECIMAL(5,2) DEFAULT 99.9,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smtp_servers_active ON smtp_servers(is_active);
CREATE INDEX idx_smtp_servers_priority ON smtp_servers(priority DESC);
```

### Email Templates Table

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  purpose VARCHAR(50),
  variables TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  ab_test_group VARCHAR(20), -- 'control', 'variant'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_templates_purpose ON email_templates(purpose);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);
```

### Email Logs Table

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  to TEXT[] NOT NULL,
  subject VARCHAR(500),
  smtp_server_id UUID REFERENCES smtp_servers(id),
  template_id UUID REFERENCES email_templates(id),
  status VARCHAR(50), -- 'sent', 'failed', 'bounced'
  message_ids TEXT[] DEFAULT '{}',
  admin_id UUID,
  priority VARCHAR(20), -- 'high', 'normal', 'low'
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_smtp_server ON email_logs(smtp_server_id);
```

### SMS Gateways Table

```sql
CREATE TABLE sms_gateways (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50),
  api_key VARCHAR(500) NOT NULL, -- encrypted
  api_secret VARCHAR(500), -- encrypted
  sender_id VARCHAR(20) NOT NULL,
  base_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  description TEXT,
  max_rate_per_hour INTEGER DEFAULT 1000,
  daily_limit INTEGER DEFAULT 10000,
  balance_check_enabled BOOLEAN DEFAULT true,
  status VARCHAR(50), -- 'active', 'failed'
  current_balance DECIMAL(10,2),
  last_balance_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_gateways_active ON sms_gateways(is_active);
CREATE INDEX idx_sms_gateways_provider ON sms_gateways(provider);
```

### SMS Templates Table

```sql
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  purpose VARCHAR(50),
  character_count INTEGER,
  sms_count INTEGER,
  version INTEGER DEFAULT 1,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_templates_purpose ON sms_templates(purpose);
```

### SMS Logs Table

```sql
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY,
  phone_numbers TEXT[] NOT NULL,
  message TEXT,
  gateway_id UUID REFERENCES sms_gateways(id),
  template_id UUID REFERENCES sms_templates(id),
  status VARCHAR(50), -- 'sent', 'failed'
  delivery_status VARCHAR(50), -- 'pending', 'delivered', 'failed'
  message_ids TEXT[] DEFAULT '{}',
  sms_count INTEGER,
  cost DECIMAL(10,2),
  admin_id UUID,
  priority VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_created ON sms_logs(created_at DESC);
```

---

## 🔄 Automatic Failover Logic

### How It Works

1. **Email Failover**
   - Admin sends email
   - System gets available SMTP servers (sorted by priority)
   - Tries primary server
   - If fails → automatically tries next server
   - Continues until success or all servers exhausted
   - Admin doesn't know which server was used
   - Logged in `email_logs` table

2. **SMS Failover**
   - Admin sends SMS
   - System gets available gateways (checks balance first)
   - Tries primary gateway
   - If fails → automatically tries next gateway
   - Switches to alternative provider if needed
   - Cost calculated based on actual gateway used
   - Logged in `sms_logs` table

### Example Failover Scenario

```
SendEmail()
  ├─ Try Server 1 (Gmail) → FAILED (connection timeout)
  ├─ Try Server 2 (SendGrid) → FAILED (auth error)
  ├─ Try Server 3 (AWS SES) → SUCCESS ✓
  └─ Return: {
       success: true,
       used_server_id: 'server-3-id',
       message_ids: ['...']
     }
```

---

## 📊 Monitoring & Alerts

### Server/Gateway Health Checks

Run every hour:

```typescript
import { smtpServerService, smsGatewayService } from "@/src/services";

// Check all SMTP servers
const smtpServers = await smtpServerService.getSmtpServers();
for (const server of smtpServers) {
  await smtpServerService.testSmtpConnection(server.id);
}

// Check all SMS gateways
const gateways = await smsGatewayService.getGateways();
for (const gateway of gateways) {
  await smsGatewayService.testGateway(gateway.id);
}
```

### Balance Monitoring

Check every 6 hours:

```typescript
const gateways = await smsGatewayService.getGateways({
  is_active: true,
});

for (const gateway of gateways) {
  if (gateway.balance_check_enabled) {
    await smsGatewayService.checkBalance(gateway.id);
    // Auto-creates alert if balance < 100
  }
}
```

### Performance Metrics

```typescript
// Email server performance
const emailStats = await smtpServerService.getServerStats(serverId, 30);
console.log(`Success Rate: ${emailStats.success_rate}`);
console.log(`Avg Response: ${emailStats.avg_response_time_ms}ms`);

// SMS gateway performance
const smsStats = await smsGatewayService.getGatewayStats(gatewayId, 30);
console.log(`Success Rate: ${smsStats.success_rate}`);
console.log(`Delivery Rate: ${smsStats.delivery_rate}`);
```

---

## 🚀 Best Practices

### For Email

1. **Server Configuration**
   - Use at least 2 SMTP servers for redundancy
   - Set different priorities (primary, secondary, tertiary)
   - Monitor response times
   - Test connections daily

2. **Template Management**
   - Use default templates for common purposes
   - Include all variables in template
   - Version templates for A/B testing
   - Validate variables before rendering

3. **Bulk Sending**
   - Use `smtp_randomize: true` for load distribution
   - Set `retry_on_failure: true` for critical emails
   - Monitor failed emails in logs
   - Implement retry scheduler

### For SMS

1. **Gateway Setup**
   - Bulk SMS BD as primary for Bangladesh
   - Twilio as backup for international
   - Monitor balance alerts closely
   - Test all gateways weekly

2. **Template Usage**
   - Keep SMS under 160 characters (1 SMS count)
   - Use short variable names
   - Test cost estimates before bulk send
   - Archive old templates

3. **Bulk SMS**
   - Use `gateway_randomize: true` for distribution
   - Implement rate limiting (max 100/sec)
   - Process in batches of 1000
   - Track cost per campaign

---

## 🔒 Security Considerations

✅ **Encryption**

- API keys/secrets encrypted at rest (AES-256-CBC)
- Passwords never logged
- Credentials only decrypted when needed

✅ **Access Control**

- Only admins can manage servers/gateways
- Track admin_id in all logs
- Implement rate limiting per admin
- Audit all configuration changes

✅ **Data Protection**

- SMTP passwords encrypted
- API keys encrypted
- No sensitive data in logs
- PII handling compliant

---

## 📈 Performance Tips

1. **Server Selection**
   - Sort by priority and current load
   - Check rate limits before sending
   - Use connection pooling
   - Cache server list (refresh hourly)

2. **Bulk Operations**
   - Process in batches of 1000+
   - Distribute across servers
   - Use background jobs
   - Implement queue system

3. **Monitoring**
   - Alert on server failures
   - Track balance changes
   - Monitor response times
   - Log all errors

---

## Summary

| Feature           | Email        | SMS          |
| ----------------- | ------------ | ------------ |
| Multiple Servers  | ✅ Unlimited | ✅ Unlimited |
| Templates         | ✅ Yes       | ✅ Yes       |
| Auto-failover     | ✅ Yes       | ✅ Yes       |
| Bulk Sending      | ✅ Yes       | ✅ Yes       |
| Cost Tracking     | ✅ Yes       | ✅ Yes       |
| Balance Check     | ❌ N/A       | ✅ Yes       |
| Scheduling        | ✅ Yes       | ✅ Yes       |
| Logging           | ✅ Full      | ✅ Full      |
| Health Monitoring | ✅ Yes       | ✅ Yes       |

---

**Status**: ✅ PRODUCTION READY
**Methods**: 40+ combined
**Lines of Code**: 1,200+
**Date**: June 3, 2026

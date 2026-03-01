# PVRPOSE AI - Deployment & Environment Configuration Guide

## Vercel Environment Variables Setup

### Required Environment Variables

To enable the AI Assessment form submission and PDF roadmap generation, configure these environment variables in your Vercel dashboard:

1. **Navigate to Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Go to: Settings > Environment Variables

2. **Add the following variables:**

#### MAKE_WEBHOOK_URL (Required)
```
Name: MAKE_WEBHOOK_URL
Value: https://hook.us1.make.com/YOUR_ACTUAL_WEBHOOK_URL
Environment: Production, Preview, Development
```

**How to get this:**
1. Log into Make.com (https://make.com)
2. Create or open your assessment processing scenario
3. Add a "Webhooks > Custom Webhook" module at the start
4. Copy the webhook URL
5. Paste into Vercel environment variable

#### AIRTABLE_API_KEY (Optional - if using direct Airtable backup)
```
Name: AIRTABLE_API_KEY
Value: patXXXXXXXXXXXXXXXX
Environment: Production, Preview, Development
```

**How to get this:**
1. Go to: https://airtable.com/create/tokens
2. Create a new Personal Access Token
3. Grant permissions: `data.records:read`, `data.records:write`
4. Select your base
5. Copy the token

#### AIRTABLE_BASE_ID (Optional)
```
Name: AIRTABLE_BASE_ID
Value: appXXXXXXXXXXXXXX
Environment: Production, Preview, Development
```

**How to get this:**
1. Open your Airtable base
2. Go to: Help > API Documentation
3. Find the Base ID in the URL or introduction section
4. Format: starts with "app"

#### AIRTABLE_TABLE_NAME (Optional)
```
Name: AIRTABLE_TABLE_NAME
Value: AI Assessments
Environment: Production, Preview, Development
```

The exact name of your Airtable table (default: "AI Assessments")

---

## Make.com Scenario Setup

Your Make.com scenario should handle:

1. **Receive Webhook Data** (Custom Webhook module)
   - Receives JSON payload from `/api/submit-assessment`

2. **Store in Airtable** (Airtable > Create Record)
   - Base: Your AI Assessments base
   - Table: AI Assessments
   - Map fields from webhook data

3. **Generate PDF Roadmap** (Options):
   - **Option A:** Use Claude API to generate personalized PDF content
   - **Option B:** Use template-based PDF generator (e.g., PDFMonkey, DocRaptor)
   - **Option C:** Use Google Docs template + export to PDF

4. **Send Email** (Gmail/SendGrid/Email module)
   - Attach generated PDF
   - Send to user's email address
   - Include personalized recommendations

### Example Make.com Scenario Flow

```
Webhook → Airtable (Create Record) → Router:
  ├─ Path 1: Generate PDF (Claude/PDF Service)
  │   └─ Send Email with PDF attachment
  └─ Path 2: Send notification to you (optional)
```

---

## Airtable Table Structure

### Recommended Fields for "AI Assessments" Table

| Field Name | Type | Description |
|---|---|---|
| Name | Single line text | Respondent name |
| Email | Email | Respondent email |
| Phone | Phone | Optional phone number |
| AI Readiness Score | Number | 0-100 score |
| Assessment Answers | Long text | Full Q&A responses |
| Timestamp | Date/Time | Submission timestamp |
| Source | Single select | "assessment_completion" |
| Consent Marketing | Checkbox | CASL consent |
| Consent Timestamp | Date/Time | Consent timestamp |
| Jurisdiction | Single line text | "CA" for Canadian |
| Fingerprint | Single line text | Duplicate detection |
| Status | Single select | New, Contacted, Converted |

---

## Testing the Setup

### 1. Local Testing

```bash
# Create .env.local file (not tracked in git)
cp .env.example .env.local

# Add your actual values
nano .env.local

# Install Vercel CLI
npm i -g vercel

# Run locally
vercel dev
```

Visit: http://localhost:3000/assessment.html

### 2. Test Submission

1. Fill out the assessment
2. Enter test email (use your own)
3. Submit form
4. Check:
   - ✅ No console errors
   - ✅ Success message displayed
   - ✅ Airtable record created
   - ✅ Email received with PDF

---

## Security Best Practices

✅ **Never commit .env files** - Already in .gitignore
✅ **Use Vercel environment variables** - Secure & encrypted
✅ **Rotate API keys regularly** - Every 90 days minimum
✅ **Restrict CORS origins** - Only your domain
✅ **Validate all inputs** - XSS & injection protection
✅ **Rate limiting** - Built into assessment form
✅ **CASL compliance** - Consent tracking included

---

## Deployment Checklist

- [ ] Set MAKE_WEBHOOK_URL in Vercel
- [ ] Set Airtable variables (if using)
- [ ] Create Airtable base & table
- [ ] Build Make.com scenario
- [ ] Test webhook receives data
- [ ] Test PDF generation works
- [ ] Test email delivery works
- [ ] Test with real email address
- [ ] Verify CASL compliance text
- [ ] Check mobile responsiveness
- [ ] Deploy to production

---

## Troubleshooting

### "Server configuration error"
- Check MAKE_WEBHOOK_URL is set in Vercel
- Verify environment is set to Production/Preview/Development

### "Failed to submit assessment"
- Check Make.com webhook URL is correct
- Verify webhook is active in Make.com
- Check Vercel function logs: Vercel Dashboard > Deployments > Functions

### "No email received"
- Check spam folder
- Verify email module in Make.com
- Check Make.com scenario execution history
- Verify PDF generation step succeeded

### "Airtable error"
- Verify API key has correct permissions
- Check base ID and table name are correct
- Ensure table structure matches expected fields

---

## Support

For implementation support, contact:
- Email: juan@pvrpose.ai
- Documentation: https://vercel.com/docs/environment-variables
- Make.com Help: https://www.make.com/en/help
- Airtable API: https://airtable.com/developers/web/api/introduction

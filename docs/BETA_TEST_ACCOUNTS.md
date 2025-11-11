# Beta Test Account Documentation

## Overview
Comprehensive test accounts created for Verdict Path beta testing. All accounts use the password: **password123**

## Test Accounts

### 1️⃣ Individual User Account
**Username:** `beta_individual`  
**Password:** `password123`  
**User Type:** Individual  
**Subscription:** Free Tier

**Features:**
- ✅ 44% litigation roadmap completion (18/60 substages completed)
- ✅ 2 pending attorney-assigned tasks
- ✅ 1 upcoming appointment with law firm
- ✅ Connected to Beta Test Law Firm (LAW-BETA01)
- ✅ 245 pirate coins
- ✅ 5-day login streak
- ✅ Linked to 4 medical providers

**Completed Substages:**
- Pre-Litigation: 11 substages (Police Report, Body Cam, Medical Bills, etc.)
- Complaint Filed: 4 substages
- Discovery: 3 substages

---

### 2️⃣ Law Firm Account
**Username:** `beta_lawfirm`  
**Password:** `password123`  
**User Type:** Law Firm  
**Subscription:** Premium  
**Firm Code:** LAW-BETA01

**Features:**
- ✅ 42 client accounts (varied subscription tiers: Free, Basic, Premium)
- ✅ 23 patient accounts (linked to medical providers)
- ✅ 10 active bill negotiations at various stages:
  - Pending provider response
  - Pending firm response
  - Call requested
  - Accepted
- ✅ Premium plan with disbursement access
- ✅ Stripe Connect account configured (acct_beta_lawfirm_12345)
- ✅ Medium firm size classification

**Negotiation Details:**
- Bill amounts ranging from $5,000 to $9,500
- Various medical services (Emergency Room, Physical Therapy, MRI, Surgery, etc.)
- Different negotiation statuses for testing workflows

---

### 3️⃣ Medical Provider Account
**Username:** `beta_provider`  
**Password:** `password123`  
**User Type:** Medical Provider  
**Subscription:** Premium  
**Provider Code:** MED-BETA01

**Features:**
- ✅ 23 active patients
- ✅ 15 notifications (10 unread, 5 read)
- ✅ Multiple active negotiations with Beta Test Law Firm
- ✅ Premium plan with disbursement access
- ✅ Stripe Connect account configured (acct_beta_provider_67890)
- ✅ Specialty: Orthopedic Surgery
- ✅ NPI Number: 1234567890

**Notification Types:**
- New negotiation requests
- Counter offers received
- Negotiation accepted
- New patients added
- Documents uploaded

---

## Additional Test Data

### Client Accounts (42 total)
- Email pattern: `client1@beta.test` through `client42@beta.test`
- Password: `password123` (all accounts)
- Subscription distribution:
  - Free tier: ~60%
  - Basic tier: ~27%
  - Premium tier: ~13%
- Varying coin balances (67-731 coins)
- Login streaks from 2-7 days
- Last login dates varying over past 10 days

### Patient Accounts (23 total)
- Email pattern: `patient1@beta.test` through `patient23@beta.test`
- Password: `password123` (all accounts)
- All on Free tier
- Coin balances: 42-306 coins
- Login streaks: 2-6 days
- Linked to both law firm and medical provider

### Additional Medical Providers (3)
Created for testing multi-provider scenarios:
1. **Advanced Imaging Center** (Radiology) - MED-BETA02
2. **Physical Therapy Associates** (Physical Therapy) - MED-BETA03
3. **Pain Management Clinic** (Pain Management) - MED-BETA04

All use password: `password123`

---

## Database Statistics

| Entity | Count | Notes |
|--------|-------|-------|
| Law Firms | 1 | Premium tier |
| Medical Providers | 4 | 1 Premium, 3 Basic |
| Individual Users | 1 | Free tier |
| Clients | 42 | Mixed tiers |
| Patients | 23 | All Free tier |
| Negotiations | 10 | Various statuses |
| Litigation Substages | 18 | 44% completion |
| Tasks | 2 | Both pending |
| Appointments | 1 | Upcoming |
| Notifications | 15 | 10 unread |

---

## Testing Workflows

### Individual User Testing
1. Login as `beta_individual`
2. Check roadmap progress (44% complete)
3. View pending tasks in Actions tab
4. Check upcoming appointment
5. Test coin balance display (245 coins)

### Law Firm Testing
1. Login as `beta_lawfirm`
2. View client list (42 clients + 23 patients)
3. Access bill negotiations portal (10 active)
4. Test disbursement features (Premium access)
5. Create new tasks for clients
6. Send notifications

### Medical Provider Testing
1. Login as `beta_provider`
2. View patient list (23 patients)
3. Check notifications (15 total, 10 unread)
4. Access bill negotiations (multiple active)
5. Test disbursement features (Premium access)

---

## Seed Script

**Location:** `backend/scripts/seed-beta-accounts.js`

**Usage:**
```bash
cd backend
node scripts/seed-beta-accounts.js
```

**Features:**
- Atomic transactions (all-or-nothing)
- Comprehensive error handling
- Detailed progress logging
- Automatic cleanup on failure
- Bcrypt password hashing

---

## Important Notes

1. **Password Security:** All accounts use `password123` - DO NOT use in production
2. **Stripe Accounts:** Mock Stripe Connect IDs configured - replace with real accounts for production testing
3. **Data Persistence:** Running the script again will create duplicate accounts unless cleaned up first
4. **Foreign Keys:** All relationships properly configured and validated
5. **Premium Features:** Both law firm and medical provider have Premium access for testing disbursement features

---

## Cleanup Script

To remove all beta test accounts:

```sql
-- Run in psql or database tool
DELETE FROM calendar_events WHERE user_id IN (SELECT id FROM users WHERE email = 'beta_individual');
DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM medical_providers WHERE provider_code LIKE 'MED-BETA%');
DELETE FROM negotiation_history WHERE negotiation_id IN (SELECT id FROM negotiations WHERE law_firm_id IN (SELECT id FROM law_firms WHERE firm_code = 'LAW-BETA01'));
DELETE FROM negotiations WHERE law_firm_id IN (SELECT id FROM law_firms WHERE firm_code = 'LAW-BETA01');
DELETE FROM law_firm_tasks WHERE law_firm_id IN (SELECT id FROM law_firms WHERE firm_code = 'LAW-BETA01');
DELETE FROM litigation_substage_completions WHERE user_id IN (SELECT id FROM users WHERE connected_law_firm_id IN (SELECT id FROM law_firms WHERE firm_code = 'LAW-BETA01'));
DELETE FROM law_firm_clients WHERE law_firm_id IN (SELECT id FROM law_firms WHERE firm_code = 'LAW-BETA01');
DELETE FROM medical_provider_patients WHERE medical_provider_id IN (SELECT id FROM medical_providers WHERE provider_code LIKE 'MED-BETA%');
DELETE FROM users WHERE connected_law_firm_id IN (SELECT id FROM law_firms WHERE firm_code = 'LAW-BETA01');
DELETE FROM law_firms WHERE firm_code = 'LAW-BETA01';
DELETE FROM medical_providers WHERE provider_code LIKE 'MED-BETA%';
```

---

## Generated: November 11, 2025
## Contact: contact@verdictpath.io

# Payment Integration Roadmap for BidForge

## ✅ Current Implementation (What's Working Now)

### 1. **Plan-Based Limits**
- **FREE Plan Limits:**
  - Contractors: 1 active project
  - Subcontractors: 2 bid submissions per month
- **PRO/ENTERPRISE Plans:** Unlimited usage

### 2. **Real-Time Enforcement**
- Users are blocked when they hit limits
- Toast notifications appear with "Upgrade" button
- Notifications now show **reset date** (e.g., "Resets in 5 days (Feb 1)")

### 3. **Usage Dashboard**
- New `UsageTracker` component on dashboard shows:
  - Current usage (e.g., "2/2 bids used")
  - Progress bar visualization
  - Days until monthly reset
  - Upgrade prompt when limit reached

### 4. **Plan Management API**
- `/api/companies/[id]/plan` - Updates company plan
- Authorization checks (users can only upgrade their own company)
- Optimistic UI with rollback on failure

## ❌ What's Missing (Requires Payment Integration)

### 1. **Payment Gateway Integration**

#### Option A: Stripe (Recommended)
```bash
bun add stripe @stripe/stripe-js
```

**Implementation Steps:**
1. Create Stripe account and get API keys
2. Create products/prices in Stripe Dashboard:
   - PRO: $20/month (contractors) or $15/month (subcontractors)
   - ENTERPRISE: Custom pricing
3. Add Stripe Checkout API route
4. Handle webhooks for subscription events

**Files to Create:**
- `app/api/stripe/checkout/route.ts` - Create checkout session
- `app/api/stripe/webhook/route.ts` - Handle subscription events
- `app/api/stripe/portal/route.ts` - Customer portal for managing subscriptions

#### Option B: PayPal
```bash
bun add @paypal/checkout-server-sdk
```

### 2. **Subscription Management**

**Database Schema Updates Needed:**
```typescript
// Add to companies table
stripeCustomerId: varchar("stripe_customer_id")
stripeSubscriptionId: varchar("stripe_subscription_id")
subscriptionPeriodEnd: timestamp("subscription_period_end")
cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false)
```

**Features to Implement:**
- Automatic renewal handling
- Subscription cancellation (with access until period end)
- Downgrade handling (immediate or at period end)
- Failed payment retry logic

### 3. **Monthly Usage Reset**

**Current Behavior:**
- Limits are calculated in real-time based on current month
- No database tracking of monthly usage

**Recommended Enhancement:**
```typescript
// Add to companies table
monthlyUsage: jsonb("monthly_usage") // { "2026-01": { bids: 2, projects: 1 } }
```

**Cron Job Needed:**
- Reset usage counters on 1st of each month
- Send "Your limits have reset" email notifications

### 4. **Billing Dashboard**

**Features to Add:**
- View current plan and billing cycle
- Download invoices
- Update payment method
- View usage history
- Cancel/upgrade subscription

## 🚀 Quick Start Guide (Stripe Integration)

### Step 1: Environment Variables
```env
# Add to .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_PRO_CONTRACTOR=price_...
STRIPE_PRICE_PRO_SUBCONTRACTOR=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### Step 2: Update Pricing Page
```tsx
// app/pricing/page.tsx
const handleSubscribe = async (plan: string) => {
  if (!currentUser || !company) {
    toast({ title: "Please log in first" })
    return
  }

  // Call Stripe Checkout API
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ 
      plan, 
      companyId: company.id,
      userRole: currentUser.role 
    })
  })

  const { sessionId } = await response.json()
  
  // Redirect to Stripe Checkout
  const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  await stripe.redirectToCheckout({ sessionId })
}
```

### Step 3: Handle Webhooks
```typescript
// app/api/stripe/webhook/route.ts
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()
  
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

  switch (event.type) {
    case 'checkout.session.completed':
      // Upgrade user's plan in database
      await upgradePlan(customerId, plan)
      break
    
    case 'customer.subscription.deleted':
      // Downgrade to FREE plan
      await downgradePlan(customerId)
      break
    
    case 'invoice.payment_failed':
      // Send payment failure email
      await sendPaymentFailureEmail(customerId)
      break
  }

  return new Response(JSON.stringify({ received: true }))
}
```

## 📊 User Experience Flow

### Scenario 1: FREE User Hits Limit
1. User tries to create 2nd project (contractor) or 3rd bid (subcontractor)
2. System blocks action and shows toast:
   - "Monthly Bid Limit Reached"
   - "Your FREE plan allows 2 bids per month"
   - "Resets in 5 days (Feb 1)" ← **NEW**
   - [Upgrade] button
3. User clicks "Upgrade" → redirected to `/pricing`
4. User selects PRO plan → Stripe Checkout opens
5. After payment → webhook upgrades plan → user can now perform unlimited actions

### Scenario 2: PRO User Wants to Cancel
1. User goes to Settings → Billing
2. Clicks "Manage Subscription" → Stripe Customer Portal opens
3. User cancels subscription
4. Webhook sets `cancelAtPeriodEnd = true`
5. User keeps PRO access until end of billing cycle
6. On renewal date → webhook downgrades to FREE
7. User sees usage tracker showing new limits

## 🔐 Security Considerations

1. **Webhook Signature Verification** - Always verify Stripe signatures
2. **Idempotency** - Handle duplicate webhook events
3. **Authorization** - Verify user owns the company before upgrading
4. **Rate Limiting** - Prevent abuse of checkout endpoint
5. **Audit Logging** - Log all plan changes and payment events

## 📝 Next Steps

**To enable full payment integration:**

1. **Choose Payment Provider** (Stripe recommended)
2. **Install Dependencies** (`bun add stripe @stripe/stripe-js`)
3. **Create Stripe Account** and configure products
4. **Add Environment Variables**
5. **Implement Checkout Flow** (3 API routes)
6. **Test with Stripe Test Mode**
7. **Deploy Webhook Endpoint** (must be publicly accessible)
8. **Go Live** with production keys

**Estimated Development Time:** 2-3 days for basic Stripe integration

---

## 💡 Current State Summary

**What works RIGHT NOW without payment integration:**
- ✅ Users get FREE plan on registration
- ✅ Limits are enforced in real-time
- ✅ Upgrade prompts show with reset dates
- ✅ Usage tracker shows current usage
- ✅ Manual plan upgrades via API (for testing)

**What requires payment integration:**
- ❌ Actual credit card processing
- ❌ Recurring billing
- ❌ Automatic plan downgrades
- ❌ Invoice generation
- ❌ Payment failure handling

The foundation is solid - adding Stripe is a straightforward integration that plugs into the existing plan management system.

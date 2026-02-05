"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { getTradeLabel } from "@/lib/utils/format"
import type { TradeCategory, User } from "@/lib/types"

const TRADES: TradeCategory[] = [
  "ELECTRICAL",
  "PLUMBING",
  "HVAC",
  "CONCRETE",
  "FRAMING",
  "ROOFING",
  "DRYWALL",
  "FLOORING",
  "PAINTING",
  "LANDSCAPING",
]

export default function OnboardingPage() {
  const router = useRouter()
  const { currentUser, isAuthenticated, createCompany } = useStore()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    companyName: "",
    companyType: "",
    address: "",
    phone: "",
    website: "",
    description: "",
    trades: [] as TradeCategory[],
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!currentUser) return null

  const handleTradeToggle = (trade: TradeCategory) => {
    setFormData((prev) => ({
      ...prev,
      trades: prev.trades.includes(trade) ? prev.trades.filter((t) => t !== trade) : [...prev.trades, trade],
    }))
  }

  const handleSubmit = async () => {
    try {
      // Create company via API
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.companyName,
          type: formData.companyType,
          address: formData.address,
          phone: formData.phone,
          website: formData.website,
          description: formData.description,
          trades: formData.trades,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company')
      }

      // Reload current user data from the auth endpoint
      const userResponse = await fetch('/api/auth/me')
      if (userResponse.ok) {
        const userData = await userResponse.json()
        const updatedUser: User = {
          ...userData.user,
          createdAt: new Date(userData.user.createdAt),
          updatedAt: new Date(userData.user.updatedAt),
          isFounder: userData.user.isFounder || false,
          company: userData.user.company ? {
            ...userData.user.company,
            trialEndDate: userData.user.company.trialEndDate ? new Date(userData.user.company.trialEndDate) : null
          } : undefined,
        }
        useStore.setState({ currentUser: updatedUser })
      }

      router.push("/pricing?onboarding=true")
    } catch (error) {
      console.error('Failed to create company:', error)
      // Handle error - you might want to show a toast or error message
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Complete your profile</h1>
          <p className="text-muted-foreground">Tell us about your company to get started</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Company Information</h2>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="ABC Construction Inc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyType">Company Type *</Label>
                <Input
                  id="companyType"
                  value={formData.companyType}
                  onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                  placeholder={
                    currentUser.role === "CONTRACTOR"
                      ? "General Contractor"
                      : "Electrical Contractor, Plumbing Contractor, etc."
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State ZIP"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell us about your company, experience, and specializations..."
                  rows={4}
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full bg-accent hover:bg-accent-hover text-white"
                disabled={!formData.companyName || !formData.companyType || !formData.address || !formData.phone}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && currentUser.role === "SUBCONTRACTOR" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Select Your Trades</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the construction trades your company specializes in
              </p>

              <div className="grid grid-cols-2 gap-3">
                {TRADES.map((trade) => (
                  <div key={trade} className="flex items-center space-x-2 rounded-lg border border-border p-3">
                    <Checkbox
                      id={trade}
                      checked={formData.trades.includes(trade)}
                      onCheckedChange={() => handleTradeToggle(trade)}
                    />
                    <Label htmlFor={trade} className="flex-1 cursor-pointer font-normal">
                      {getTradeLabel(trade)}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white"
                  disabled={formData.trades.length === 0}
                >
                  Complete Setup
                </Button>
              </div>
            </div>
          )}

          {step === 2 && currentUser.role === "CONTRACTOR" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">All Set!</h2>
              <p className="text-muted-foreground mb-4">
                Your company profile has been created. You can start creating projects and inviting subcontractors.
              </p>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1 bg-accent hover:bg-accent-hover text-white">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

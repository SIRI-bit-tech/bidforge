"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { getTradeLabel } from "@/lib/utils/format"
import type { TradeCategory } from "@/lib/types"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { usePlanLimits } from "@/hooks/use-plan-limits"

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

export default function NewProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { currentUser, loadProjects } = useStore()
  const { checkLimit } = usePlanLimits()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    budgetMin: "",
    budgetMax: "",
    startDate: "",
    endDate: "",
    deadline: "",
    trades: [] as TradeCategory[],
  })
  const [saving, setSaving] = useState(false)

  const handleTradeToggle = (trade: TradeCategory) => {
    setFormData((prev) => ({
      ...prev,
      trades: prev.trades.includes(trade) ? prev.trades.filter((t) => t !== trade) : [...prev.trades, trade],
    }))
  }

  const handleSubmit = async (publish: boolean) => {
    if (publish && !checkLimit("CREATE_PROJECT")) return

    setSaving(true)

    try {
      // Create project via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          budgetMin: formData.budgetMin,
          budgetMax: formData.budgetMax,
          startDate: formData.startDate,
          endDate: formData.endDate,
          deadline: formData.deadline,
          trades: formData.trades, // Include selected trades
          createdById: currentUser?.id,
          status: publish ? 'PUBLISHED' : 'DRAFT',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      // Refresh projects in store
      await loadProjects()

      toast({
        title: publish ? "Project Published Successfully!" : "Project Saved as Draft",
        description: publish ? "Your project is now live and visible to subcontractors." : "Your project has been saved and can be published later.",
      })

      router.push(`/projects/${data.project.id}`)
    } catch (error) {
      console.error("Failed to create project:", error)
      toast({
        title: "Failed to Create Project",
        description: "There was an error creating your project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const isValid =
    formData.title &&
    formData.description &&
    formData.location &&
    formData.budgetMin &&
    formData.budgetMax &&
    formData.startDate &&
    formData.endDate &&
    formData.deadline &&
    formData.trades.length > 0

  return (
    <div>
      <div className="mb-8">
        <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-4">Create New Project</h1>
        <p className="text-muted-foreground mt-1">Fill in the details to create a new RFP</p>
      </div>

      <div className="max-w-3xl">
        <div className="rounded-lg border border-border bg-card p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Downtown Office Complex - Phase 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the project scope, requirements, and specifications..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="City, State"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetMin">Minimum Budget (USD) *</Label>
              <Input
                id="budgetMin"
                type="number"
                value={formData.budgetMin}
                onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                placeholder="3000000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetMax">Maximum Budget (USD) *</Label>
              <Input
                id="budgetMax"
                type="number"
                value={formData.budgetMax}
                onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                placeholder="5000000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Bid Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Required Trades *</Label>
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
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => router.push("/projects")} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              variant="outline"
              className="flex-1"
              disabled={!isValid || saving}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              className="flex-1 bg-accent hover:bg-accent-hover text-white"
              disabled={!isValid || saving}
            >
              {saving ? "Creating..." : "Publish Project"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

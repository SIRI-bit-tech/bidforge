"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { getTradeLabel } from "@/lib/utils/format"
import type { TradeCategory } from "@/lib/types"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

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
  const { createProject, publishProject } = useStore()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    budget: "",
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
    setSaving(true)

    try {
      const project = createProject({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        budget: Number(formData.budget),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        deadline: new Date(formData.deadline),
        trades: formData.trades,
      })

      if (publish) {
        publishProject(project.id)
      }

      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error("Failed to create project:", error)
    } finally {
      setSaving(false)
    }
  }

  const isValid =
    formData.title &&
    formData.description &&
    formData.location &&
    formData.budget &&
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

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (USD) *</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
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

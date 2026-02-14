"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, DollarSign, FileText, Plus, Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate, formatTimeUntil } from "@/lib/utils/format"
import type { LineItem, Alternate } from "@/lib/types"
import { DocumentUpload } from "@/components/document-upload"

type LineItemForm = Pick<LineItem, "description" | "unit" | "notes"> & {
  id: string
  quantity: string
  unitPrice: string
}

type AlternateForm = Pick<Alternate, "description" | "notes"> & {
  id: string
  adjustmentAmount: string
}

export default function SubmitBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { projects, bids, currentUser, loadProjects, loadBids } = useStore()
  const { checkLimit } = usePlanLimits()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [attachmentsOpen, setAttachmentsOpen] = useState(false)
  const [completionTime, setCompletionTime] = useState("")
  const [mobilizationLeadTime, setMobilizationLeadTime] = useState("")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      id: "item-0",
      description: "",
      quantity: "",
      unit: "",
      unitPrice: "",
      notes: "",
    },
  ])
  const [alternates, setAlternates] = useState<AlternateForm[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
        if (currentUser?.role === "SUBCONTRACTOR") {
          await loadBids(id)
        }
      } catch (error) {
        console.error('Failed to load project:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, currentUser, loadProjects, loadBids])

  const project = projects.find((p) => p.id === id)
  const existingBid = bids.find((bid) => bid.projectId === id && bid.subcontractorId === currentUser?.id)

  const addLineItem = () => {
    setLineItems((items) => [
      ...items,
      {
        id: `item-${items.length + 1}-${Date.now()}`,
        description: "",
        quantity: "",
        unit: "",
        unitPrice: "",
        notes: "",
      },
    ])
  }

  const updateLineItem = (id: string, field: keyof LineItemForm, value: string) => {
    setLineItems((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeLineItem = (id: string) => {
    setLineItems((items) => (items.length <= 1 ? items : items.filter((item) => item.id !== id)))
  }

  const addAlternate = () => {
    setAlternates((items) => [
      ...items,
      {
        id: `alt-${items.length + 1}-${Date.now()}`,
        description: "",
        adjustmentAmount: "",
        notes: "",
      },
    ])
  }

  const updateAlternate = (id: string, field: keyof AlternateForm, value: string) => {
    setAlternates((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeAlternate = (id: string) => {
    setAlternates((items) => items.filter((item) => item.id !== id))
  }

  const subtotal = lineItems.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity) || 0
    const unitPrice = parseFloat(item.unitPrice) || 0
    return sum + quantity * unitPrice
  }, 0)

  const alternatesTotal = alternates.reduce((sum, alt) => {
    const amount = parseFloat(alt.adjustmentAmount) || 0
    return sum + amount
  }, 0)

  const totalAmount = subtotal + alternatesTotal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !currentUser) return
    if (!checkLimit("SUBMIT_BID")) return

    const preparedLineItems = lineItems
      .map((item) => ({
        ...item,
        description: item.description.trim(),
        quantity: item.quantity.trim(),
        unit: item.unit.trim(),
        unitPrice: item.unitPrice.trim(),
      }))
      .filter(
        (item) =>
          item.description &&
          item.quantity &&
          item.unitPrice &&
          !Number.isNaN(parseFloat(item.quantity)) &&
          !Number.isNaN(parseFloat(item.unitPrice)),
      )

    if (preparedLineItems.length === 0) {
      toast({
        title: "Add at least one line item",
        description: "Include the major scope items for your bid.",
        variant: "destructive",
      })
      return
    }

    if (!totalAmount || totalAmount <= 0) {
      toast({
        title: "Enter valid pricing",
        description: "Check your quantities and unit prices before submitting.",
        variant: "destructive",
      })
      return
    }

    const lineItemsPayload = preparedLineItems.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit || "LS",
      unitPrice: parseFloat(item.unitPrice),
      notes: item.notes?.trim() || undefined,
    }))

    const alternatesPayload = alternates
      .map((alt) => ({
        description: alt.description.trim(),
        adjustmentAmount: alt.adjustmentAmount.trim(),
        notes: alt.notes?.trim() || undefined,
      }))
      .filter((alt) => alt.description && alt.adjustmentAmount && !Number.isNaN(parseFloat(alt.adjustmentAmount)))
      .map((alt) => ({
        description: alt.description,
        adjustmentAmount: parseFloat(alt.adjustmentAmount),
        notes: alt.notes,
      }))

    const completionDays = completionTime ? parseInt(completionTime, 10) : undefined

    const combinedNotes =
      mobilizationLeadTime.trim().length > 0
        ? `Mobilization lead time: ${mobilizationLeadTime.trim()}\n\n${notes.trim()}`
        : notes.trim()

    setSubmitting(true)
    try {
      const bidData = {
        projectId: project.id,
        totalAmount,
        notes: combinedNotes || undefined,
        completionTime: completionDays && !Number.isNaN(completionDays) ? completionDays : undefined,
        lineItems: lineItemsPayload,
        alternates: alternatesPayload,
      }

      const response = await fetch("/api/bids", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bidData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit bid")
      }

      toast({
        title: "Bid submitted successfully",
        description: "Your bid has been submitted and shared with the general contractor.",
      })

      router.push(`/my-bids`)
    } catch (error) {
      console.error("Failed to submit bid:", error)
      toast({
        title: "Failed to submit bid",
        description:
          error instanceof Error
            ? error.message
            : "There was an error submitting your bid. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl lg:text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/opportunities')} className="w-full lg:w-auto">
            Back to Opportunities
          </Button>
        </div>
      </div>
    )
  }

  if (currentUser?.role !== "SUBCONTRACTOR") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl lg:text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Only subcontractors can submit bids.</p>
          <Button onClick={() => router.push("/projects")} className="w-full lg:w-auto">
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  if (existingBid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl lg:text-2xl font-bold mb-4">Bid already submitted</h1>
          <p className="text-muted-foreground mb-4">
            You have already submitted a bid for this project. You can review it from your bids page.
          </p>
          <Button onClick={() => router.push("/my-bids")} className="w-full lg:w-auto">
            Go to My Bids
          </Button>
        </div>
      </div>
    )
  }

  const hasValidLineItems = lineItems.some(
    (item) =>
      item.description.trim() &&
      item.quantity.trim() &&
      item.unitPrice.trim() &&
      !Number.isNaN(parseFloat(item.quantity)) &&
      !Number.isNaN(parseFloat(item.unitPrice)),
  )

  const isValid = hasValidLineItems && totalAmount > 0

  const timeRemaining = formatTimeUntil(project.deadline)
  const deadlineLabel = formatDate(project.deadline)
  const isPastDeadline = new Date(project.deadline) < new Date()

  return (
    <div className="min-h-screen">
      <div className="mb-6 lg:mb-8">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mt-4">Submit Bid</h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">
          Provide a detailed proposal for the {project.title} development phase.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(320px,1fr)] items-start"
      >
        <div className="space-y-6">
          <Card className="rounded-2xl border border-border bg-card">
            <CardContent className="p-4 lg:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {project.location}
                    </div>
                    <div className="mt-1 text-base lg:text-lg font-semibold text-foreground">
                      {project.title}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {project.city && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {project.city}
                        </span>
                      )}
                      {project.state && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {project.state}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Due date</div>
                  <div className="text-sm font-semibold text-foreground">{deadlineLabel}</div>
                  <div
                    className={`text-xs font-medium ${
                      isPastDeadline ? "text-destructive" : "text-warning"
                    }`}
                  >
                    {isPastDeadline ? "Deadline passed" : `${timeRemaining} left`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bid line items
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="rounded-full text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add line item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="hidden md:grid grid-cols-[minmax(0,2.3fr),minmax(0,0.7fr),minmax(0,0.9fr),minmax(0,1.1fr),40px] gap-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Description</span>
                <span>Quantity</span>
                <span>Unit</span>
                <span>Unit price</span>
                <span></span>
              </div>
              <div className="space-y-3">
                {lineItems.map((item) => {
                  const itemTotal =
                    (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                  return (
                    <div
                      key={item.id}
                      className="grid gap-3 md:grid-cols-[minmax(0,2.3fr),minmax(0,0.7fr),minmax(0,0.9fr),minmax(0,1.1fr),40px]"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground md:hidden">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                          placeholder="e.g. Foundation concrete work"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground md:hidden">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, "quantity", e.target.value)}
                          placeholder="250"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground md:hidden">Unit</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateLineItem(item.id, "unit", e.target.value)}
                          placeholder="CY"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground md:hidden">Unit price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)}
                            placeholder="450"
                            className="pl-8"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Line total: {itemTotal > 0 ? formatCurrency(itemTotal) : "--"}
                        </div>
                      </div>
                      <div className="flex items-center justify-end pt-5 md:pt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Alternate pricing (optional)</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAlternate}
                className="rounded-full text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add alternate
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {alternates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add optional alternates to suggest value engineering options or add-ons.
                </p>
              )}
              <div className="space-y-3">
                {alternates.map((alt) => (
                  <div key={alt.id} className="grid gap-3 md:grid-cols-[minmax(0,2fr),minmax(0,1fr),40px]">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        value={alt.description}
                        onChange={(e) => updateAlternate(alt.id, "description", e.target.value)}
                        placeholder="Alt #1: Use high-efficiency insulation"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Adjustment amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          value={alt.adjustmentAmount}
                          onChange={(e) => updateAlternate(alt.id, "adjustmentAmount", e.target.value)}
                          placeholder="8400"
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAlternate(alt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Timeline and notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estimated-timeline">Estimated timeline (days)</Label>
                  <Input
                    id="estimated-timeline"
                    type="number"
                    min="1"
                    value={completionTime}
                    onChange={(e) => setCompletionTime(e.target.value)}
                    placeholder="e.g. 45"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobilization-lead-time">Mobilization lead time</Label>
                  <Input
                    id="mobilization-lead-time"
                    value={mobilizationLeadTime}
                    onChange={(e) => setMobilizationLeadTime(e.target.value)}
                    placeholder="e.g. 2 weeks"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional notes / qualifications</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Include any additional information about your bid, approach, or qualifications..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-dashed border-border bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Documentation & attachments</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setAttachmentsOpen(true)}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Upload files
              </Button>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => setAttachmentsOpen(true)}
                className="w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/60 px-6 py-10 text-center hover:border-accent/60 hover:bg-background transition-colors cursor-pointer"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attach supporting documents such as scope breakdowns or clarifications.
                </p>
              </button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border border-slate-900 bg-slate-950 text-slate-50 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-base">Bid summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-medium">
                  {subtotal > 0 ? formatCurrency(subtotal) : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Alternates applied</span>
                <span className={`font-medium ${alternatesTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {alternatesTotal !== 0 ? formatCurrency(alternatesTotal) : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tax (if applicable)</span>
                <span className="text-slate-300">Calculated later</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Total bid amount
              </div>
              <div className="text-3xl font-semibold">
                {totalAmount > 0 ? formatCurrency(totalAmount) : formatCurrency(0)}
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover text-white"
                disabled={!isValid || submitting}
              >
                {submitting ? "Submitting..." : "Submit bid"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                disabled
              >
                Save draft (coming soon)
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              By submitting this bid, you agree to the project's terms and confirm that all pricing
              is valid for 30 days.
            </p>
          </CardContent>
        </Card>
      </form>

      {project && (
        <DocumentUpload
          projectId={project.id}
          isOpen={attachmentsOpen}
          onClose={() => setAttachmentsOpen(false)}
        />
      )}
    </div>
  )
}

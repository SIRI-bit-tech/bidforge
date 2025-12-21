"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react"
import Link from "next/link"
import type { LineItem, Alternate } from "@/lib/types"

export default function CreateBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const { projects, createBid, submitBid } = useStore()
  const project = projects.find((p) => p.id === projectId)

  const [bidData, setBidData] = useState({
    notes: "",
    lineItems: [
      {
        id: "temp-1",
        bidId: "",
        description: "",
        quantity: 0,
        unit: "",
        unitPrice: 0,
        totalPrice: 0,
      },
    ] as LineItem[],
    alternates: [] as Alternate[],
  })

  const [saving, setSaving] = useState(false)

  if (!project) {
    return (
      <EmptyState
        icon={FileText}
        title="Project not found"
        description="The project you're trying to bid on doesn't exist"
        action={{
          label: "Back to Opportunities",
          onClick: () => router.push("/opportunities"),
        }}
      />
    )
  }

  const addLineItem = () => {
    setBidData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: `temp-${Date.now()}`,
          bidId: "",
          description: "",
          quantity: 0,
          unit: "",
          unitPrice: 0,
          totalPrice: 0,
        },
      ],
    }))
  }

  const removeLineItem = (index: number) => {
    setBidData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setBidData((prev) => {
      const newLineItems = [...prev.lineItems]
      newLineItems[index] = { ...newLineItems[index], [field]: value }

      if (field === "quantity" || field === "unitPrice") {
        const quantity = field === "quantity" ? Number(value) : newLineItems[index].quantity
        const unitPrice = field === "unitPrice" ? Number(value) : newLineItems[index].unitPrice
        newLineItems[index].totalPrice = quantity * unitPrice
      }

      return { ...prev, lineItems: newLineItems }
    })
  }

  const addAlternate = () => {
    setBidData((prev) => ({
      ...prev,
      alternates: [
        ...prev.alternates,
        {
          id: `temp-alt-${Date.now()}`,
          bidId: "",
          description: "",
          adjustmentAmount: 0,
        },
      ],
    }))
  }

  const removeAlternate = (index: number) => {
    setBidData((prev) => ({
      ...prev,
      alternates: prev.alternates.filter((_, i) => i !== index),
    }))
  }

  const updateAlternate = (index: number, field: keyof Alternate, value: string | number) => {
    setBidData((prev) => {
      const newAlternates = [...prev.alternates]
      newAlternates[index] = { ...newAlternates[index], [field]: value }
      return { ...prev, alternates: newAlternates }
    })
  }

  const calculateTotal = () => {
    return bidData.lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  const handleSubmit = async (asDraft: boolean) => {
    setSaving(true)

    try {
      const totalAmount = calculateTotal()
      const bid = createBid({
        projectId,
        totalAmount,
        notes: bidData.notes,
        lineItems: bidData.lineItems,
        alternates: bidData.alternates,
      })

      if (!asDraft) {
        submitBid(bid.id)
      }

      router.push("/my-bids")
    } catch (error) {
      console.error("Failed to create bid:", error)
    } finally {
      setSaving(false)
    }
  }

  const isValid = bidData.lineItems.length > 0 && bidData.lineItems.every((item) => item.description && item.quantity)

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-4">Submit Bid</h1>
        <p className="text-muted-foreground mt-1">{project.title}</p>
      </div>

      <div className="max-w-4xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Line Items</h2>

          <div className="space-y-4">
            {bidData.lineItems.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`desc-${index}`}>Description *</Label>
                      <Input
                        id={`desc-${index}`}
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        placeholder="e.g., Electrical panel installation"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`qty-${index}`}>Quantity *</Label>
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateLineItem(index, "quantity", Number(e.target.value))}
                        placeholder="0"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`unit-${index}`}>Unit *</Label>
                      <Input
                        id={`unit-${index}`}
                        value={item.unit}
                        onChange={(e) => updateLineItem(index, "unit", e.target.value)}
                        placeholder="e.g., each, sqft"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`price-${index}`}>Unit Price *</Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateLineItem(index, "unitPrice", Number(e.target.value))}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total</Label>
                      <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium">
                        ${item.totalPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {bidData.lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(index)}
                      className="ml-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addLineItem} className="mt-4 w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Alternates (Optional)</h2>
            <Button type="button" variant="outline" size="sm" onClick={addAlternate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Alternate
            </Button>
          </div>

          {bidData.alternates.length > 0 ? (
            <div className="space-y-4">
              {bidData.alternates.map((alt, index) => (
                <div key={alt.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`alt-desc-${index}`}>Description</Label>
                        <Input
                          id={`alt-desc-${index}`}
                          value={alt.description}
                          onChange={(e) => updateAlternate(index, "description", e.target.value)}
                          placeholder="e.g., LED upgrade for all fixtures"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`alt-amt-${index}`}>Adjustment Amount</Label>
                        <Input
                          id={`alt-amt-${index}`}
                          type="number"
                          value={alt.adjustmentAmount || ""}
                          onChange={(e) => updateAlternate(index, "adjustmentAmount", Number(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAlternate(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add alternate pricing options if applicable (e.g., material substitutions, timeline changes)
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={bidData.notes}
              onChange={(e) => setBidData({ ...bidData, notes: e.target.value })}
              placeholder="Add any additional information, clarifications, or special conditions..."
              rows={4}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Bid Amount</div>
              <div className="text-3xl font-bold text-foreground">${calculateTotal().toLocaleString()}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              variant="outline"
              className="flex-1"
              disabled={!isValid || saving}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              className="flex-1 bg-accent hover:bg-accent-hover text-white"
              disabled={!isValid || saving}
            >
              {saving ? "Submitting..." : "Submit Bid"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

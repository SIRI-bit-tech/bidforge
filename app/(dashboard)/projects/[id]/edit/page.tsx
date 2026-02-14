"use client"

import { use, useEffect, useState, type ChangeEvent } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { getTradeLabel } from "@/lib/utils/format"
import type { TradeCategory } from "@/lib/types"
import { useUploadThing } from "@/lib/services/uploadthing"

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

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { currentUser, projects, loadProjects } = useStore()
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { startUpload } = useUploadThing("projectImage")
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

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadProjects()
      } catch (error) {
        console.error("Failed to load projects:", error)
      } finally {
        setInitialized(true)
      }
    }

    loadData()
  }, [loadProjects])

  const project = projects.find((project) => project.id === id)

  useEffect(() => {
    if (!project) return

    setFormData({
      title: project.title,
      description: project.description,
      location: project.location,
      budgetMin: project.budgetMin ? String(project.budgetMin) : "",
      budgetMax: project.budgetMax ? String(project.budgetMax) : "",
      startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : "",
      endDate: project.endDate ? project.endDate.toISOString().slice(0, 10) : "",
      deadline: project.deadline ? project.deadline.toISOString().slice(0, 10) : "",
      trades: project.trades as TradeCategory[],
    })

    setImagePreview(project.coverImageUrl || null)
  }, [project])

  const handleTradeToggle = (trade: TradeCategory) => {
    setFormData((previous) => ({
      ...previous,
      trades: previous.trades.includes(trade)
        ? previous.trades.filter((value) => value !== trade)
        : [...previous.trades, trade],
    }))
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }

    setImageFile(file)
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  const handleSubmit = async (publish: boolean) => {
    if (!project || !currentUser) return

    setSaving(true)

    try {
      let coverImageUrl = project.coverImageUrl || undefined

      if (imageFile) {
        const uploaded = await startUpload([imageFile])
        if (!uploaded || uploaded.length === 0) {
          throw new Error("Failed to upload cover image")
        }
        coverImageUrl = uploaded[0].serverData.url
      }

      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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
          trades: formData.trades,
          status: publish ? "PUBLISHED" : project.status,
          coverImageUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update project")
      }

      await loadProjects()

      toast({
        title: publish ? "Project Republished" : "Project Updated",
        description: publish
          ? "Your changes are live and the project is accepting bids."
          : "Your project details have been updated.",
      })

      router.push(`/projects/${data.project.id}`)
    } catch (error) {
      console.error("Failed to update project:", error)
      toast({
        title: "Failed to Update Project",
        description: "There was an error updating your project. Please try again.",
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

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
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
          <p className="text-muted-foreground mb-4">The project you are trying to edit does not exist.</p>
          <Button onClick={() => router.push("/projects")} className="w-full lg:w-auto">
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  if (!currentUser || (project.createdBy !== currentUser.id && project.createdById !== currentUser.id)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl lg:text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Only the project owner can edit this project.</p>
          <Button onClick={() => router.push("/projects")} className="w-full lg:w-auto">
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link href={`/projects/${project.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-4">Edit Project</h1>
        <p className="text-muted-foreground mt-1">Update project details or republish to subcontractors</p>
      </div>

      <div className="max-w-3xl">
        <div className="rounded-lg border border-border bg-card p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              placeholder="Downtown Office Complex - Phase 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
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
              onChange={(event) => setFormData({ ...formData, location: event.target.value })}
              placeholder="City, State"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Project Cover Image (optional)</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-32 overflow-hidden rounded-lg border border-dashed border-border flex items-center justify-center bg-muted">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Project cover preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground">No image selected</div>
                )}
              </div>
              <Input
                id="coverImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="max-w-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetMin">Minimum Budget (USD) *</Label>
              <Input
                id="budgetMin"
                type="number"
                value={formData.budgetMin}
                onChange={(event) => setFormData({ ...formData, budgetMin: event.target.value })}
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
                onChange={(event) => setFormData({ ...formData, budgetMax: event.target.value })}
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
                onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Bid Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(event) => setFormData({ ...formData, deadline: event.target.value })}
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
            <Button variant="outline" onClick={() => router.push(`/projects/${project.id}`)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              variant="outline"
              className="flex-1"
              disabled={!isValid || saving}
            >
              Save Changes
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              className="flex-1 bg-accent hover:bg-accent-hover text-white"
              disabled={!isValid || saving}
            >
              {saving ? "Saving..." : "Save & Publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


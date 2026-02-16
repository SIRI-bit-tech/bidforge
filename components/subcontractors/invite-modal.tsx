import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Project, User } from "@/lib/types"

export type InviteModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subcontractor: User | null
  userProjects: Project[]
  selectedProject: string
  onSelectProject: (id: string) => void
  inviteMessage: string
  onChangeMessage: (v: string) => void
  onSend: () => void
}

export function InviteModal({
  open,
  onOpenChange,
  subcontractor,
  userProjects,
  selectedProject,
  onSelectProject,
  inviteMessage,
  onChangeMessage,
  onSend,
}: InviteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Project</DialogTitle>
          <DialogDescription>Send an invitation to {subcontractor?.name} to bid on one of your projects.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {userProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You don't have any published projects yet.</p>
              <p className="text-sm text-muted-foreground mb-4">Create and publish a project first to invite subcontractors.</p>
              <Button variant="outline" onClick={() => (window.location.href = "/projects")}>Go to Projects</Button>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="project">Select Project</Label>
                <Select value={selectedProject} onValueChange={onSelectProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message..."
                  value={inviteMessage}
                  onChange={(e) => onChangeMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onSend} disabled={!selectedProject} className="flex-1 bg-accent hover:bg-accent-hover text-white">
                  Send Invitation
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

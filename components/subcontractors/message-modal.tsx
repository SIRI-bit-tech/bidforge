import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { User } from "@/lib/types"

export type MessageModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subcontractor: User | null
  messageText: string
  onChangeMessage: (v: string) => void
  sending: boolean
  onSend: () => void
}

export function MessageModal({
  open,
  onOpenChange,
  subcontractor,
  messageText,
  onChangeMessage,
  sending,
  onSend,
}: MessageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>Send a message to {subcontractor?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="messageText">Message</Label>
            <Textarea
              id="messageText"
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => onChangeMessage(e.target.value)}
              rows={6}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={onSend} disabled={!messageText.trim() || sending} className="flex-1 bg-accent hover:bg-accent-hover text-white">
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

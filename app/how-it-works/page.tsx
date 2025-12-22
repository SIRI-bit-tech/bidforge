import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, UserPlus, FileText, Users, Award, CheckCircle, Search, MessageSquare, Wifi } from "lucide-react"
import { Navbar } from "@/components/navbar"

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">How BidForge Works</h1>
            <p className="text-xl text-muted-foreground">
              A complete platform that connects contractors with qualified subcontractors through intelligent discovery, 
              real-time communication, and streamlined bidding.
            </p>
          </div>
        </div>
      </section>

      {/* Process Overview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-foreground mb-4">Simple. Efficient. Connected.</h2>
              <p className="text-lg text-muted-foreground">
                From subcontractor discovery to project completion, our platform streamlines every step with real-time communication.
              </p>
            </div>

            {/* For Contractors */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-foreground mb-2">For General Contractors</h3>
                <p className="text-muted-foreground">Discover, connect, and collaborate with qualified subcontractors</p>
              </div>

              <div className="grid md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">1. Post Your Project</h4>
                  <p className="text-sm text-muted-foreground">
                    Create detailed project listings with specifications, timelines, and trade requirements.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">2. Discover Subcontractors</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse our searchable directory, filter by trade specialties, and view detailed company profiles.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">3. Communicate & Invite</h4>
                  <p className="text-sm text-muted-foreground">
                    Chat in real-time with potential subcontractors and send project invitations to qualified candidates.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">4. Review Bids</h4>
                  <p className="text-sm text-muted-foreground">
                    Compare detailed bids with line items, alternates, and continue discussions via instant messaging.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">5. Award & Manage</h4>
                  <p className="text-sm text-muted-foreground">
                    Select the best bid, award the contract, and manage the project with ongoing communication.
                  </p>
                </div>
              </div>
            </div>

            {/* For Subcontractors */}
            <div>
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-foreground mb-2">For Subcontractors</h3>
                <p className="text-muted-foreground">Build your profile, connect with contractors, and win more projects</p>
              </div>

              <div className="grid md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">1. Create Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Build your company profile with certifications, trade specializations, and portfolio.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">2. Get Discovered</h4>
                  <p className="text-sm text-muted-foreground">
                    Appear in contractor searches based on your trades, location, and expertise.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">3. Connect & Discuss</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive invitations, chat with contractors about project details, and ask clarifying questions.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">4. Submit Bids</h4>
                  <p className="text-sm text-muted-foreground">
                    Create comprehensive bids with line items, alternates, and project timelines.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">5. Win & Execute</h4>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications when you win, and coordinate project execution through real-time chat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose BidForge?</h2>
              <p className="text-lg text-muted-foreground">
                Built specifically for the construction industry with modern features that matter
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Search className="w-6 h-6 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Smart Subcontractor Discovery</h3>
                </div>
                <p className="text-muted-foreground">
                  Browse a searchable directory of qualified subcontractors. Filter by trade specialties, location, 
                  and certifications to find the perfect match for your project.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Wifi className="w-6 h-6 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Real-Time Communication</h3>
                </div>
                <p className="text-muted-foreground">
                  Instant messaging with Socket.IO technology. Chat in real-time, get read receipts, 
                  and never miss important project discussions.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Detailed Bid Management</h3>
                </div>
                <p className="text-muted-foreground">
                  Create comprehensive bids with line items, alternates, and detailed breakdowns for complete
                  transparency and accurate project costing.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-6 h-6 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Verified Professional Network</h3>
                </div>
                <p className="text-muted-foreground">
                  Connect with pre-vetted contractors and subcontractors with verified credentials, 
                  certifications, and proven track records.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="w-6 h-6 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Project-Based Messaging</h3>
                </div>
                <p className="text-muted-foreground">
                  Organized conversations by project with message history, notifications, 
                  and seamless coordination between all stakeholders.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-6 h-6 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Secure Document Management</h3>
                </div>
                <p className="text-muted-foreground">
                  Securely share and manage project documents, blueprints, and specifications 
                  with version control and access management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of contractors and subcontractors streamlining their bidding process
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-accent hover:bg-accent-hover text-white">
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact">Schedule Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white font-bold text-lg">
                  BF
                </div>
                <span className="text-lg font-bold">BidForge</span>
              </div>
              <p className="text-sm text-muted-foreground">The complete platform for construction bid management</p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/how-it-works" className="hover:text-foreground">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2025 BidForge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
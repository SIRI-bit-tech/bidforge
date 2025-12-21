import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, UserPlus, FileText, Users, Award, CheckCircle } from "lucide-react"
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
              A simple, streamlined process that connects contractors with qualified subcontractors for better project
              outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* Process Overview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-foreground mb-4">Simple. Efficient. Transparent.</h2>
              <p className="text-lg text-muted-foreground">
                From project posting to bid award, our platform streamlines every step of the bidding process.
              </p>
            </div>

            {/* For Contractors */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-foreground mb-2">For General Contractors</h3>
                <p className="text-muted-foreground">Post projects and find qualified subcontractors</p>
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">1. Post Your Project</h4>
                  <p className="text-sm text-muted-foreground">
                    Create detailed project listings with specifications, timelines, and requirements.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">2. Invite Subcontractors</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse our network and invite qualified subcontractors to bid on your project.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">3. Review Bids</h4>
                  <p className="text-sm text-muted-foreground">
                    Compare detailed bids with line items, alternates, and subcontractor profiles.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">4. Award Contract</h4>
                  <p className="text-sm text-muted-foreground">
                    Select the best bid and award the contract with automatic notifications.
                  </p>
                </div>
              </div>
            </div>

            {/* For Subcontractors */}
            <div>
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-foreground mb-2">For Subcontractors</h3>
                <p className="text-muted-foreground">Discover opportunities and submit competitive bids</p>
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">1. Create Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Build your company profile with certifications, past work, and trade specializations.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">2. Receive Invitations</h4>
                  <p className="text-sm text-muted-foreground">
                    Get invited to bid on projects that match your expertise and capacity.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">3. Submit Detailed Bids</h4>
                  <p className="text-sm text-muted-foreground">
                    Create comprehensive bids with line items, alternates, and project timelines.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">4. Win Projects</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified when your bid is selected and start working on the project.
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
                Built specifically for the construction industry with features that matter
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Detailed Bid Management</h3>
                <p className="text-muted-foreground">
                  Create comprehensive bids with line items, alternates, and detailed breakdowns for complete
                  transparency.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Qualified Network</h3>
                <p className="text-muted-foreground">
                  Connect with pre-vetted contractors and subcontractors with verified credentials and track records.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Real-time Communication</h3>
                <p className="text-muted-foreground">
                  Stay connected throughout the bidding process with integrated messaging and notifications.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Document Management</h3>
                <p className="text-muted-foreground">
                  Securely share and manage project documents, blueprints, and specifications in one place.
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
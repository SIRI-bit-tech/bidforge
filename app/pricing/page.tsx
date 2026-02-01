"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, Shield, Zap, Building2, HardHat } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PricingPage() {
    const router = useRouter()
    const { currentUser, companies, upgradePlan } = useStore()
    const [role, setRole] = useState<"CONTRACTOR" | "SUBCONTRACTOR">(
        currentUser?.role || "CONTRACTOR"
    )

    const company = companies.find((c) => c.id === currentUser?.companyId)

    const handleSubscribe = (plan: "FREE" | "PRO" | "ENTERPRISE") => {
        if (company) {
            upgradePlan(company.id, plan)
        }
        router.push("/dashboard")
    }

    const contractorPlans = [
        {
            name: "Basic",
            price: "$0",
            description: "Perfect for small projects",
            features: [
                "1 Active Project",
                "Unlimited Drafts",
                "Basic Bid Comparison",
                "Standard Support",
            ],
            plan: "FREE" as const,
            cta: "Current Plan",
        },
        {
            name: "Pro",
            price: "$20",
            period: "per month",
            description: "For scaling contractors",
            features: [
                "Unlimited Active Projects",
                "Advanced Bid Comparison",
                "Direct Subcontractor Invites",
                "10GB Document Storage",
                "Priority Support",
            ],
            plan: "PRO" as const,
            cta: "Upgrade to Pro",
            popular: true,
        },
        {
            name: "Enterprise",
            price: "Custom",
            description: "For large construction firms",
            features: [
                "Multiple Team Seats",
                "Dedicated Account Manager",
                "Custom Workflow Integration",
                "API Access",
                "White-label Reports",
            ],
            plan: "ENTERPRISE" as const,
            cta: "Contact Sales",
        },
    ]

    const subcontractorPlans = [
        {
            name: "Free",
            price: "$0",
            description: "Find your first project",
            features: [
                "2 Bid Submissions / mo",
                "Browse All Opportunities",
                "Basic Profile",
                "Standard Support",
            ],
            plan: "FREE" as const,
            cta: "Current Plan",
        },
        {
            name: "Pro",
            price: "$15",
            period: "per month",
            description: "Win more work",
            features: [
                "Unlimited Bid Submissions",
                "Priority Bid Placement",
                "Verified Professional Badge",
                "Unlimited Active Trades",
                "Advanced Analytics",
            ],
            plan: "PRO" as const,
            cta: "Upgrade to Pro",
            popular: true,
        },
        {
            name: "Elite",
            price: "$129",
            period: "per month",
            description: "Master the market",
            features: [
                "Featured Company Profile",
                "Early Opportunity Access",
                "Custom Bid Templates",
                "Dedicated Support",
                "Market Rate Insights",
            ],
            plan: "ENTERPRISE" as const,
            cta: "Go Elite",
        },
    ]

    const plans = role === "CONTRACTOR" ? contractorPlans : subcontractorPlans

    return (
        <div className="min-h-screen bg-background py-16 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Choose the plan that's right for your business and start building faster.
                    </p>

                    <div className="mt-10 flex justify-center items-center gap-4">
                        <span className={cn("text-sm font-medium", role === "CONTRACTOR" ? "text-foreground" : "text-muted-foreground")}>
                            General Contractor
                        </span>
                        <button
                            onClick={() => setRole(role === "CONTRACTOR" ? "SUBCONTRACTOR" : "CONTRACTOR")}
                            className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                        >
                            <span
                                className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                    role === "SUBCONTRACTOR" ? "translate-x-6" : "translate-x-1"
                                )}
                            />
                        </button>
                        <span className={cn("text-sm font-medium", role === "SUBCONTRACTOR" ? "text-foreground" : "text-muted-foreground")}>
                            Subcontractor
                        </span>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mt-16">
                    {plans.map((p) => {
                        const isCurrent = company?.plan === p.plan
                        return (
                            <div
                                key={p.name}
                                className={cn(
                                    "relative flex flex-col p-8 rounded-2xl border transition-all duration-300",
                                    p.popular
                                        ? "border-accent shadow-xl bg-card scale-105 z-10"
                                        : "border-border bg-card/50 hover:border-accent/50"
                                )}
                            >
                                {p.popular && (
                                    <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-accent text-white text-xs font-bold rounded-full">
                                        MOST POPULAR
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-2xl font-bold">{p.name}</h3>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
                                        {p.period && <span className="text-muted-foreground">/{p.period}</span>}
                                    </div>
                                    <p className="mt-2 text-muted-foreground">{p.description}</p>
                                </div>

                                <div className="flex-1 space-y-4 mb-8">
                                    {p.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-3 text-sm">
                                            <div className="mt-1 p-0.5 rounded-full bg-success/20 text-success">
                                                <Check className="h-3 w-3" />
                                            </div>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={() => handleSubscribe(p.plan)}
                                    variant={p.popular ? "default" : "outline"}
                                    className={cn(
                                        "w-full h-12 text-sm font-semibold",
                                        p.popular && "bg-accent hover:bg-accent-hover text-white",
                                        isCurrent && "border-success text-success bg-success/5 hover:bg-success/10"
                                    )}
                                    disabled={isCurrent}
                                >
                                    {isCurrent ? "Current Plan" : p.cta}
                                </Button>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-16 text-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/dashboard")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Skip for now, continue to dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                <div className="mt-20 grid md:grid-cols-3 gap-12 border-t border-border pt-20">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Shield className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold">Secure Payments</h4>
                        <p className="text-sm text-muted-foreground">We use industry-standard encryption to protect your data and transactions.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Zap className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold">Instant Access</h4>
                        <p className="text-sm text-muted-foreground">Get immediate access to premium features once your subscription starts.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold">Scale at Ease</h4>
                        <p className="text-sm text-muted-foreground">Switch between plans as your business grows without any downtime.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

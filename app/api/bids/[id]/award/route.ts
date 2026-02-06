import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { broadcastNotification } from '@/lib/socket/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const token = request.cookies.get('auth-token')?.value

        if (!token) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const payload = verifyJWT(token)
        if (!payload || payload.role !== 'CONTRACTOR') {
            return NextResponse.json(
                { error: 'Access denied. Only contractors can award bids.' },
                { status: 403 }
            )
        }

        // Verify bid exists and belongs to a project owned by the user
        const bid = await prisma.bid.findUnique({
            where: { id },
            include: {
                project: true,
                subcontractor: {
                    select: { companyId: true }
                }
            }
        })

        if (!bid) {
            return NextResponse.json(
                { error: 'Bid not found' },
                { status: 404 }
            )
        }

        if (bid.project.createdById !== payload.userId) {
            return NextResponse.json(
                { error: 'Access denied. You can only award bids for your own projects.' },
                { status: 403 }
            )
        }

        if (bid.project.status !== 'PUBLISHED') {
            return NextResponse.json(
                { error: 'Project is not in a state to award bids' },
                { status: 400 }
            )
        }

        // Transaction to update bid, project, decline others, and notify
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update the awarded bid
            const awardedBid = await tx.bid.update({
                where: { id },
                data: {
                    status: 'AWARDED',
                    updatedAt: new Date()
                }
            })

            // 2. Update project status
            const updatedProject = await tx.project.update({
                where: { id: bid.projectId },
                data: {
                    status: 'AWARDED',
                    updatedAt: new Date()
                }
            })

            // 3. Decline all other bids for this project
            await tx.bid.updateMany({
                where: {
                    projectId: bid.projectId,
                    id: { not: id },
                    status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DRAFT'] }
                },
                data: {
                    status: 'DECLINED',
                    updatedAt: new Date()
                }
            })

            // 4. Create notification for the winner
            const winNotification = await tx.notification.create({
                data: {
                    userId: bid.subcontractorId,
                    type: 'BID_AWARDED',
                    title: 'Congratulations! Bid Awarded',
                    message: `Your bid for "${bid.project.title}" has been awarded!`,
                    link: `/my-bids/${bid.id}`, // Assuming this route exists or similar
                    read: false,
                    createdAt: new Date(),
                }
            })

            // 5. Get other bidders to notify them
            const otherBids = await tx.bid.findMany({
                where: {
                    projectId: bid.projectId,
                    id: { not: id },
                    status: 'DECLINED' // They were just updated to declined
                },
                select: { subcontractorId: true }
            })

            // Create notifications for others
            const otherNotifications = []
            for (const otherBid of otherBids) {
                // Simple deduplication if a subcontractor submitted multiple bids (unlikely but possible)
                otherNotifications.push(await tx.notification.create({
                    data: {
                        userId: otherBid.subcontractorId,
                        type: 'BID_AWARDED', // Using same type for now or maybe 'BID_DECLINED'
                        title: 'Bid Status Update',
                        message: `Another contractor was selected for "${bid.project.title}".`,
                        read: false,
                        createdAt: new Date(),
                    }
                }))
            }

            return { awardedBid, updatedProject, winNotification, otherNotifications }
        })

        // Broadcast notifications (fire and forget)
        try {
            await broadcastNotification(bid.subcontractorId, result.winNotification)
            // Could loop for others
        } catch (e) {
            console.error('Socket error:', e)
        }

        return NextResponse.json({
            success: true,
            bid: {
                ...result.awardedBid,
                totalAmount: result.awardedBid.totalAmount.toString()
            },
            project: result.updatedProject
        })

    } catch (error) {
        console.error('Bid award error:', error)
        return NextResponse.json(
            { error: 'Failed to award bid' },
            { status: 500 }
        )
    }
}

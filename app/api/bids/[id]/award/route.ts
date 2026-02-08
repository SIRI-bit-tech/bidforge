import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyJWT } from '@/lib/services/auth'
import { broadcastNotification } from '@/lib/socket/server'
import { Prisma } from '@prisma/client'

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

        // Transaction to update bid, project, decline others, and notify
        // This prevents race conditions where multiple awards could be triggered simultaneously
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Update project status atomically - this will fail if already awarded or not owned by user
            // This prevents TOCTOU (Time of Check to Time of Use) vulnerabilities
            const updatedProject = await tx.project.update({
                where: {
                    id: bid.projectId,
                    status: 'PUBLISHED',
                    createdById: payload.userId
                },
                data: {
                    status: 'AWARDED',
                    updatedAt: new Date()
                }
            })

            // 2. Update the awarded bid
            const awardedBid = await tx.bid.update({
                where: { id },
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
                    link: `/my-bids/${bid.id}`,
                    read: false,
                    createdAt: new Date(),
                }
            })

            // 5. Get other bidders to notify them
            const otherBids = await tx.bid.findMany({
                where: {
                    projectId: bid.projectId,
                    id: { not: id },
                    status: 'DECLINED'
                },
                select: { subcontractorId: true }
            })

            // Create notifications for others
            const otherNotifications = []
            for (const otherBid of otherBids) {
                otherNotifications.push(await tx.notification.create({
                    data: {
                        userId: otherBid.subcontractorId,
                        type: 'BID_AWARDED',
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

    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return NextResponse.json(
                    { error: 'Project has already been awarded or is no longer available for awarding.' },
                    { status: 409 }
                )
            }
        }

        console.error('Bid award error:', error)
        return NextResponse.json(
            { error: 'Failed to award bid' },
            { status: 500 }
        )
    }
}

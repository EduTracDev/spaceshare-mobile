import prisma from '../../utils/prisma';
import { BookingStatus, Role } from "@prisma/client";


type TrendTone = "positive" | "negative" | "neutral";
interface Trend {
    trend: number;
    tone: TrendTone;
}


export async function getDashboard() {
    const [ userSummary, activeListings, userGrowth, bookingsTrend ] = await Promise.all([
        getUserSummary(),
        getActiveListings(),
        getUserGrowth(),
        getBookingsTrend(),
    ]);

    return {
        summary: {
            ...userSummary,
            activeListings,
        },
        userGrowth,
        bookingsTrend,
    };
}



// HELPERS
// function calculateTrend(current: number, previous: number): Trend {
//     const difference = current - previous;
//     if (difference > 0) {
//         return {
//             trend: difference,
//             tone: "positive",
//         };
//     }
//     if (difference < 0) {
//         return {
//             trend: difference,
//             tone: "negative",
//         };
//     }
//     return {
//         trend: 0,
//         tone: "neutral",
//     };
// }

function calculateTrend(
    current: number,
    previous: number
): Trend {
    if (previous === 0) {
        return {
            trend: current > 0 ? 100 : 0,
            tone: current > 0 ? "positive" : "neutral",
        };
    }

    const percentage = ((current - previous) / previous) * 100;

    return {
        trend: Math.round(percentage),
        tone:
            percentage > 0
                ? "positive"
                : percentage < 0
                    ? "negative"
                    : "neutral",
    };
}

function getMonthRange(date: Date) {
    const start = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );
    const end = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        1
    );
    return { start, end };
}

function getPreviousMonthRange(date: Date) {
    const start = new Date(
        date.getFullYear(),
        date.getMonth() - 1,
        1
    );
    const end = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );
    return { start, end };
}

async function getUserSummary() {
    const now = new Date();

    const currentMonth = getMonthRange(now);
    const previousMonth = getPreviousMonthRange(now);

    const [
        totalUsers,
        currentMonthUsers,
        previousMonthUsers,

        totalHosts,
        currentMonthHosts,
        previousMonthHosts,

        totalGuests,
        currentMonthGuests,
        previousMonthGuests,
    ] = await Promise.all([
        prisma.user.count(),

        prisma.user.count({
            where: {
                createdAt: {
                    gte: currentMonth.start,
                    lt: currentMonth.end,
                },
            },
        }),

        prisma.user.count({
            where: {
                createdAt: {
                    gte: previousMonth.start,
                    lt: previousMonth.end,
                },
            },
        }),

        prisma.user.count({
            where: {
                role: Role.HOST,
            },
        }),

        prisma.user.count({
            where: {
                role: Role.HOST,
                createdAt: {
                    gte: currentMonth.start,
                    lt: currentMonth.end,
                },
            },
        }),

        prisma.user.count({
            where: {
                role: Role.HOST,
                createdAt: {
                    gte: previousMonth.start,
                    lt: previousMonth.end,
                },
            },
        }),

        prisma.user.count({
            where: {
                role: Role.GUEST,
            },
        }),

        prisma.user.count({
            where: {
                role: Role.GUEST,
                createdAt: {
                    gte: currentMonth.start,
                    lt: currentMonth.end,
                },
            },
        }),

        prisma.user.count({
            where: {
                role: Role.GUEST,
                createdAt: {
                    gte: previousMonth.start,
                    lt: previousMonth.end,
                },
            },
        }),
    ]);

    return {
        totalUsers: {
            value: totalUsers,
            ...calculateTrend(
                currentMonthUsers,
                previousMonthUsers
            ),
        },

        totalHosts: {
            value: totalHosts,
            ...calculateTrend(
                currentMonthHosts,
                previousMonthHosts
            ),
        },

        totalGuests: {
            value: totalGuests,
            ...calculateTrend(
                currentMonthGuests,
                previousMonthGuests
            ),
        },
    };
}

async function getActiveListings() {
    const now = new Date();

    const currentMonth = getMonthRange(now);
    const previousMonth = getPreviousMonthRange(now);

    const [total, current, previous] = await Promise.all([
        prisma.listing.count({
            where: {
                status: "APPROVED",
            },
        }),
        prisma.listing.count({
            where: {
                status: "APPROVED",
                createdAt: {
                    gte: currentMonth.start,
                    lt: currentMonth.end,
                },
            },
        }),
        prisma.listing.count({
            where: {
                status: "APPROVED",
                createdAt: {
                    gte: previousMonth.start,
                    lt: previousMonth.end,
                },
            },
        }),
    ]);

    return {
        value: total,
        ...calculateTrend(current, previous),
    };
}

async function getUserGrowth() {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

        const { start, end } = getMonthRange(date);

        months.push({
            date,
            start,
            end,
        });
    }

    const results = await Promise.all(
        months.map(async ({ date, start, end }) => {
            const [host, guest] = await Promise.all([
                prisma.user.count({
                    where: {
                        role: Role.HOST,
                        createdAt: {
                            gte: start,
                            lt: end,
                        },
                    },
                }),
                prisma.user.count({
                    where: {
                        role: Role.GUEST,
                        createdAt: {
                            gte: start,
                            lt: end,
                        },
                    },
                }),
            ]);

            return {
                month: date.toLocaleString("en-US", {
                    month: "short",
                }),
                Host: host,
                Guest: guest,
            };
        })
    );

    return results;
}

async function getBookingsTrend() {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

        const { start, end } = getMonthRange(date);

        months.push({
            date,
            start,
            end,
        });
    }

    const results = await Promise.all(
        months.map(async ({ date, start, end }) => {
            const bookings = await prisma.booking.count({
                where: {
                    status: {
                        in: [
                            BookingStatus.APPROVED,
                            BookingStatus.PAID,
                            BookingStatus.COMPLETED,
                        ],
                    },
                    createdAt: {
                        gte: start,
                        lt: end,
                    },
                },
            });

            return {
                month: date.toLocaleString("en-US", {
                    month: "short",
                }),
                bookings,
            };
        })
    );

    return results;
}
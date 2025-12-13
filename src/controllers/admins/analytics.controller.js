//for job seeker
const {
    jobseekersModel
} = require('../../models/jobseekers/jobseekers.model')
//
const {
    jobInteractionModel
} = require('../../models/jobseekers/job_interaction.model')
//applications model
const {
    applicationsModel
} = require('../../models/jobseekers/applications.model')
//jobs
const {
    joblistingsModel
} = require('../../models/employers/joblistings.model')
const { round } = require('@xenova/transformers')


// const analyticsData = {
//   jobSeekers: {c✅
//     total: 1247,
//     newThisWeek: 89,
//     newThisMonth: 342,
//     active7Days: 456,
//     active30Days: 892,
//     avgApplications: 4.2,
//     totalApplications: 5234
//   },
//   jobs: {
//     totalActive: 1567,
//     newThisWeek: 123,
//     newThisMonth: 389,
//     avgApplicationsPerJob: 3.3,
//     totalApplications: 5234
//   },
//   coreSwipes: {
//     totalSwipes: 45231,
//     shortlistedCount: 8742,
//     skippedCount: 36489,
//     overallShortlistRate: "19.3%"
//   },
//   industryBreakdown: [
//     { industry: "Frontend", swipes: 50, rate: "33.9%" },
//     { industry: "Backend", swipes: 50, skips: 3892, rate: "33.8%" }
//   ],
// };



exports.getAnalytics = async (req, res) => {
    try {
        //for jobseeker DATA
        const jobseekerStats = await getjobSeekersStats();
        //forjobs DATA
        const jobsData = await getJobs();
        //core swipes
        const coreSwipesData = await getCoreSwipes();
        //industryBreakdown
        const industryBreakdown = await getIndustryBreakdown();

        const payload = {
            jobseekerStats: jobseekerStats,
            jobs: jobsData,
            coreSwipes: coreSwipesData,
            industryBreakdown
        }

        res.json({
            success: true,
            payload
        });
    } catch (err) {
        console.error("❌ Error fetching analytics:", err);

        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
}


async function getjobSeekersStats() {
    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [jsAgg] = await jobseekersModel.aggregate([{
            $facet: {
                total: [{
                    $count: "value"
                }],
                newThisWeek: [{
                        $match: {
                            createdAt: {
                                $gte: weekAgo
                            }
                        }
                    },
                    {
                        $count: "value"
                    }
                ],
                newThisMonth: [{
                        $match: {
                            createdAt: {
                                $gte: monthAgo
                            }
                        }
                    },
                    {
                        $count: "value"
                    }
                ]
            }
        }])

        const [active7Agg] = await jobInteractionModel.aggregate([{
                $match: {
                    createdAt: {
                        $gte: weekAgo
                    }
                }
            },
            {
                $group: {
                    _id: "$seekerUID"
                }
            },
            {
                $count: "value"
            },
        ]);


        const [active30Agg] = await jobInteractionModel.aggregate([{
                $match: {
                    createdAt: {
                        $gte: monthAgo
                    }
                }
            },
            {
                $group: {
                    _id: "$seekerUID"
                }
            },
            {
                $count: "value"
            },
        ]);
        const total = jsAgg.total[0]?.value || 0

        const [appsAgg] = await applicationsModel.aggregate([{
            $group: {
                _id: null,
                totalApplications: {
                    $sum: 1
                }
            }
        }])

        const totalApplications = appsAgg.totalApplications || 0
        const avgApplications = total ? totalApplications / total : 0

        return {
            total,
            newThisWeek: jsAgg?.newThisWeek[0]?.value || 0,
            newThisMonth: jsAgg?.newThisMonth[0]?.value || 0,
            active7Days: active7Agg?.value || 0,
            active30Days: active30Agg?.value || 0,
            avgApplications: parseFloat(avgApplications.toFixed(2)) || 0,
            totalApplications,
        };
    } catch (err) {
        console.error("Cannot get job seeker stats:", err);
        throw err
    }
}


async function getJobs() {
    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [jobsAgg] = await joblistingsModel.aggregate([{
                $match: {
                    isExternal: false
                }
            },
            {
                $facet: {
                    total: [{
                        $count: "value"
                    }, ],
                    newThisWeek: [{
                            $match: {
                                createdAt: {
                                    $gte: weekAgo
                                }
                            }
                        },
                        {
                            $count: "value"
                        },
                    ],
                    newThisMonth: [{
                        $match: {
                            createdAt: {
                                $gte: monthAgo
                            }
                        }
                    }, {
                        $count: "value"
                    }]
                },
            },
        ]);

        const total = jobsAgg.total[0]?.value || 0
        const newThisWeek = jobsAgg.newThisWeek[0]?.value || 0
        const newThisMonth = jobsAgg.newThisMonth[0]?.value || 0

        //for total applications
        const [appsAgg] = await applicationsModel.aggregate([{
            $group: {
                _id: null,
                totalApplications: {
                    $sum: 1
                }
            }
        }, ]);

        const totalApplications = appsAgg.totalApplications || 0
        const avgApplicationsPerJob = total > 0 ? parseFloat((totalApplications / total).toFixed(2)) : 0

        return {
            total,
            newThisWeek,
            newThisMonth,
            avgApplicationsPerJob,
            totalApplications
        };
    } catch (err) {
        console.error("Cannot get jobs datas:", err);
        throw err
    }
}


async function getCoreSwipes() {
    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // coreSwipes: {
        //     totalSwipes: 45231,
        //     shortlistedCount: 8742,
        //     skippedCount: 36489,
        //     overallShortlistRate: "19.3%"
        //   },

        const [swipesAgg] = await jobInteractionModel.aggregate([{
            $facet: {
                total: [{
                    $count: "value"
                }],
                shortlistedCount: [{
                    $match: {
                        action: 'shortlisted'
                    }
                }, {
                    $count: "value"
                }],
                skippedCount: [{
                    $match: {
                        action: 'skipped'
                    }
                }, {
                    $count: "value"
                }]
            }
        }])
        const total = swipesAgg.total[0].value || 0;
        const shortlistedCount = swipesAgg.shortlistedCount[0].value || 0
        const skippedCount = swipesAgg.skippedCount[0].value || 0
        const overallShortlistRate = parseFloat(((shortlistedCount / total) * 100).toFixed(2))

        console.log(swipesAgg);


        return {
            total,
            shortlistedCount,
            skippedCount,
            overallShortlistRate,
        };
    } catch (err) {
        console.error("Cannot get jobs datas:", err);
        throw err
    }
}

async function getIndustryBreakdown() {
    try {
        //   industryBreakdown: [
        //     { industry: "Frontend", swipes: 50, rate: "33.9%" },
        //     { industry: "Backend", swipes: 50, skips: 3892, rate: "33.8%" }
        //   ],

        const industryBreakdown = await jobInteractionModel.aggregate([
            {
            $lookup: {
                from: 'job_listings',
                localField:'jobUID',
                foreignField:'jobUID',
                as:"job"
            }
            },

            {$unwind: "$job"},

            {
                $project: {
                    _id: 0,
                    action: "$action",
                    industry : "$job.jobIndustry"
                }
            },

            {$group :{
                _id: "$industry",
                swipes: {$sum:1},
                shortlists : {$sum : {$cond: [{$eq: ['$action','shortlisted']},1,0]}}
            }},

            {
                $addFields: {
                    shortlistRate: {
                        $cond: {
                            if: {$gte: ['$swipes', 0]},
                            then: {$multiply: [{$divide: ["$shortlists", "$swipes"]},100]},
                            else: 0
                        }
                    }
                }
            },

            {$project: {
                "industry": "$_id",
                "swipes":1,
                "shortlistRate":1
            }},

            {$sort:{'shortlistRate': -1}},

            {$limit : 5}
    ])

        


        // const a = test.map(e => {
        //     e.shortlistRate =(e.shortlists/e.swipes)* 100
        // })

        // for(let i = 0; i < test.length; i++){
        //     test[i].shortlistRate = round((test[i].shortlists/test[i].swipes)* 100,1)
        // }


        return {
            industryBreakdown
        };
    } catch (err) {
        console.error("Cannot get jobs datas:", err);
        throw err
    }
}






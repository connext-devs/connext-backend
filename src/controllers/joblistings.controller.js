const {
    pipeline,
    cat
} = require('@xenova/transformers');

const {
    nanoid
} = require('nanoid');




//model
const {
    joblistingsModel
} = require('../models/employers/joblistings.model')

// NORMALIZATION
// Synonyms
const synonyms = {
    csr: "customer service representative",
    va: "virtual assistant",
    qa: "quality assurance",
    hr: "human resources",
    ux: "user experience",
    ui: "user interface",
    dev: "developer",
    it: "information technology",
    tsr: "technical support representative",
    jr: "junior",
    sr: "senior",
    mhe: "material handling equipment",
};

// Noise words
const noiseWords = [
    "urgent", "hiring", "wfh", "site", "shift", "day shift", "night shift",
    "part time", "full time", "seasonal", "open to fresh graduates",
    "no experience needed", "with experience", "location", "makati", "antipolo", "incentives",
    "apply", "apply now", "bonus", "day"
];

function norm(title, synons = synonyms, noise = noiseWords) {
    let t = title.toLowerCase();

    // Remove noise words
    for (const word of noise) {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        t = t.replace(regex, " ");
    }

    // Synonym replacement
    for (const [key, value] of Object.entries(synons)) {
        const regex = new RegExp(`\\b${key}\\b`, "gi");
        t = t.replace(regex, value);
    }

    // Replace slashes/pipes with space
    t = t.replace(/[\/|]/g, " ");

    // Remove numbers
    t = t.replace(/\d+/g, "");

    // Remove other non-alphanumeric chars
    t = t.replace(/[^a-z0-9\s]/g, " ");

    // Collapse spaces
    t = t.replace(/\s+/g, " ").trim();

    return t;
}
// ------------------------
let extractor;

async function getExtractor() {
    if (!extractor) {
        const {
            pipeline
        } = await import('@xenova/transformers');
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return extractor;
}

exports.postJobs = async (req, res) => {
    const {
        jobUID,
        companyName,
        jobTitle,
        jobIndustry,
        jobDescription,
        jobSkills,
        employment,
        workTypes,
        salaryRange,
        location,
        profilePic,
    } = req.body;

    try {
        const jobUID = `job_${nanoid(10)}`;
        



        let payload = {
            ...req.body
        }
        const extractor = await getExtractor();

        //pass the job title here to be cleaned
        const cleanTitle = norm(jobTitle);


        //and then vectorize it
        let emb = await extractor(cleanTitle, {
            pooling: 'mean',
            normalize: true
        });

        payload = {
            ...payload,
            _id: jobUID,
            jobUID,
            jobNormalized: cleanTitle,
            jobTitleVector: Array.from(emb[0].data)
        }

        console.log(payload, 'payyyy');

        const newJob = await joblistingsModel.create(payload);

        console.log(newJob);

        res.json({
            success: true,
            payload: payload,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
};



//Getting a single job posting that the employers have
async function getJobFunction(jobUID) {
  if (!jobUID) throw new Error("Missing jobUID");

  const results = await joblistingsModel.aggregate([
    {
      $match: {
        jobUID: {
          $in: Array.isArray(jobUID) ? jobUID : [jobUID]
        }
      }
    },
    {
      $project: {
        jobTitleVector: 0
      }
    },
    {
      $lookup: {
        from: "employers",            // your employer collection name
        let: { employerUID: "$employerUID" },
        pipeline: [
          { $match: { $expr: { $eq: ["$employerUID", "$$employerUID"] } } },
          { $project: {
              _id: 1,
              employerUID: 1,
              email: 1,
              companyName: 1,
              profilePic: 1,
              location: 1
            }
          }
        ],
        as: "employerInfo"
      }
    },
    { $unwind: { path: "$employerInfo", preserveNullAndEmptyArrays: true } }
  ]);

  return results[0] || null;
}


exports.getJobFunction = getJobFunction;

exports.getJob = async (req, res) => {
    const {
        jobUID
    } = req.query;
    console.log(jobUID);

    try {
        const job = await getJobFunction(jobUID);

        res.status(200).json({
            success: true,
            message: job,
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message || err,
        });
    }
};

//Getting all of the job postings that the employers have
exports.getJobs = async (req, res) => {
    const {
        employerUID
    } = req.query

    console.log(employerUID);

    try {
        const response = await joblistingsModel.find({
            "employerUID": {
                '$in': employerUID
            }
        }, {
            jobTitleVector: 0
        });

        res.status(200).json({
            success: true,
            message: response
        })

    } catch (err) {
        res.status(400).json({
            success: false,
            message: err
        })
    }
}


exports.updateJobs = async (req, res) => {
    try {
        const {
            jobUID
        } = req.params;

        console.log(jobUID);

        const {
            jobTitle,
            jobIndustry,
            jobDescription,
            jobSkills,
            employment,
            workTypes,
            salaryRange,
            location,
            status
        } = req.body;

        // Find the job
        const job = await joblistingsModel.findOne({
            jobUID
        });
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        // Build updates (exclude companyName & profilePic)
        let updates = {
            jobTitle,
            jobIndustry,
            jobDescription,
            jobSkills,
            employment,
            workTypes,
            salaryRange,
            location,
            status
        };

        // Remove undefined values
        Object.keys(updates).forEach(
            (key) => updates[key] === undefined && delete updates[key]
        );

        // Re-normalize + vectorize if jobTitle changed
        if (jobTitle) {
            const extractor = await getExtractor();
            const cleanTitle = norm(jobTitle);

            let emb = await extractor(cleanTitle, {
                pooling: "mean",
                normalize: true,
            });

            updates.jobNormalized = cleanTitle;
            updates.jobTitleVector = Array.from(emb[0].data);
        }

        const updatedJob = await joblistingsModel.findOneAndUpdate({
            jobUID
        }, {
            $set: updates
        }, {
            new: true,
            runValidators: true
        });


        res.json({
            success: true,
            message: `Successfully edited the job posting: ${jobUID}`,
            payload: updatedJob,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message,
        });
    }
};
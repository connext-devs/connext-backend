const {
    mongoose
} = require('../../config/db'); // your Mongoose connection

const {
    selenium,
    By,
    Builder
} = require('selenium-webdriver');

//for random uid
const {
    v4: uuidv4
} = require("uuid");

const {
    joblistingsModel
} = require('../../models/employers/joblistings.model')

const {
    jobInteraction
} = require('../../models/employers/joblistings.model')


//schema
const ScrapeBatchSchema = require('../../models/admins/scraping.model')

exports.createScrapeBatch = async (req, res) => {
    try {
        const {
            duration,
            numOfJobScraped,
            batchUID,
            type
        } = req.body;

        console.log(batchUID, 'testtt');

        const scrapeBatch = await ScrapeBatchSchema.create({
            duration,
            numOfJobScraped,
            batchUID,
            type
        });

        console.log("Successfully created Scrape Batch:", scrapeBatch);
        res.status(200).json({
            success: true,
            message: "Scrape Batch Created Successfully"
        })

    } catch (err) {
        console.error("❌ Error Creating Scrape Batch:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
}



// JOB SCRAPERRR -----------------------
exports.scrapeJobs = async (req, res) => {
    const {
        scrapeType
    } = req.query
    try {
        if (scrapeType.trim() === 'full') {
            const data = await scraper('full')
            res.status(200).json({
                success: true,
                data: {
                    jobs: data,
                    numberOfJobs: data.length,
                    type: 'full'
                }
            })
        } else {
            const data = await scraper('partial')
            res.status(200).json({
                success: true,
                data: {
                    jobs: data,
                    numberOfJobs: data.length,
                    type: 'partial'
                }
            })
        }
    } catch (err) {
        res.status(400).json({
            success: false,
            data: err
        })
    }
}



const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const fs = require('fs');
const scrapeModel = require('../../models/admins/scraping.model');

//--- MAIN SCRAPER
const scraper = async (scrapeType) => {
    const chrome = require('selenium-webdriver/chrome')
    const options = new chrome.Options();
    options.addArguments(
        'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    );

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    const webURL = "https://remoteok.com/";
    await driver.get(webURL);

    //wait for the jobs to load
    await sleep(5000)

    //scroll limitations
    let scrollNum = 0;
    let maxScrolls = 0

    if (scrapeType === 'full') {
        maxScrolls = 5
    } else {
        maxScrolls = 2
    }

    //getting the size of the entire page -- for automated scrolling purposes
    let lastSize = await driver.executeScript('return document.body.scrollHeight')
    console.log(lastSize);



    try {

        while (scrollNum < maxScrolls) {
            console.log(scrollNum);
            scrollNum++;

            //scrolling to bottom
            await driver.executeScript(`window.scrollTo(0, document.body.scrollHeight)`);

            //INTERVALS/delays following the rules for scraping
            await sleep(2000 + Math.random() * 3000); // 2-5 seconds random delay
            let newSize = await driver.executeScript('return document.body.scrollHeight');

            console.log(newSize);


            if (newSize === lastSize) {
                console.log("BREAK");
                break;
            }
            lastSize = newSize
            console.log('scrolling');
        }

        const jobs = await driver.findElements(By.css("tr.job"));


        //already scraped job TEMPORARY
        //GETTING JOBS
        const getJobs = await joblistingsModel
            .find({
                isExternal: true
            })
            .select("jobUID -_id"); // only jobUID, no _id

        // Convert [{ jobUID: "a" }, { jobUID: "b" }] → ["a", "b"]
        const alreadyScraped = getJobs.map(j => j.jobUID);

        // const alreadyScraped = ["1129072", "1128937", "1129081", "1129078", "1129048"]

        //randomuid
        const batchUID = uuidv4()

        let data = [];
        let scrapeCtr = 1
        for (const job of jobs) {
            console.log('Scraped jobs: ', scrapeCtr);
            scrapeCtr++
            let title = await job.getAttribute("data-search");
            let url = await job.getAttribute("data-url");
            let id = await job.getAttribute("data-id")

            // Skip if jobUID exists in the temporary array
            if (alreadyScraped.includes(id)) {
                console.log(`Skipping job ${id} because it's already scraped`);
                continue;
            }
            let postingTime = "";

            // Get full job description text from the expanded row
            let fullDescriptionText = "";
            try {
                // 1 — Markdown version (best quality)
                const descMarkdown = await driver.findElement(
                    By.css(`tr.expand[data-id="${id}"] .description .markdown`)
                );
                let rawHtml = await driver.executeScript(
                    "return arguments[0].innerHTML;",
                    descMarkdown
                );
                fullDescriptionText = cleanDescription(rawHtml);

            } catch (err1) {

                try {
                    // 2 — HTML version
                    const descHtml = await driver.findElement(
                        By.css(`tr.expand[data-id="${id}"] .description .html`)
                    );
                    let rawHtml = await driver.executeScript(
                        "return arguments[0].innerHTML;",
                        descHtml
                    );
                    fullDescriptionText = cleanDescription(rawHtml);

                } catch (err2) {

                    try {
                        // 3 — Raw description container
                        const descFallback = await driver.findElement(
                            By.css(`tr.expand[data-id="${id}"] .description`)
                        );
                        let rawHtml = await driver.executeScript(
                            "return arguments[0].innerHTML;",
                            descFallback
                        );
                        fullDescriptionText = cleanDescription(rawHtml);

                    } catch (err3) {
                        console.log(`No description found for job ${id}`);
                        fullDescriptionText = "";
                    }
                }
            }

            // get ALL tag text, hidden or not
            const tagElements = await job.findElements(By.css(".tags .tag"));
            let tags = [];

            for (const tag of tagElements) {
                let t = await tag.getAttribute("textContent");
                t = t.trim();
                if (t.length > 0) tags.push(t);
            }

            //GETTING THE TIME
            try {
                const timeElem = await job.findElement(By.css('td.time time'));
                postingTime = await timeElem.getAttribute('datetime');
            } catch (err) {
                console.log(`No posting time found for job ${id}`);
            }

            //GETTING THE SALARY:

            let salaryRaw = "";
            try {
                const salaryElem = await job.findElement(By.css('td.company div.salary'));
                salaryRaw = await salaryElem.getText(); // e.g. "$140k - $180k"
            } catch {}

            // Parse and convert salary to PHP object
            const salaryRange = parseSalary(salaryRaw);

            //GETTING THE LOCATION
            let locationRaw = "";
            try {
                const locationElem = await job.findElement(By.css('td.company div.location'));
                locationRaw = await locationElem.getText(); // e.g. "San Francisco, CA, USA" or "🌏 Worldwide"
            } catch {
                locationRaw = "";
            }

            const location = parseLocation(locationRaw);

            // Skip jobs without any tags/skills
            if (!tags || tags.length === 0) {
                console.log(`Skipping job due to missing skills/tags: ${title}`);
                continue;
            }

            const cleanedJobDescription = cleanDescription(fullDescriptionText)
            //if job contains red flag ignore the job
            if (containsRedFlag(title, cleanedJobDescription, tags)) {
                console.log(`Skipping red-flagged job: ${title}`);
                continue; // Skip this job entirely
            }

            //GETTING THE EMPLOYMENT TAGS
            const normalizedEmployment = extractEmployment(cleanedJobDescription);
            //THEN THE JOB INDUSTRY
            const jobIndustry = await classifyJob(title.split(" [")[0], tags)

            data.push({
                jobUID: id,
                jobTitle: title.split(" [")[0], // clean title
                jobSkills: tags,
                jobIndustry,
                link: "https://remoteok.com" + url,
                jobDescription: cleanedJobDescription,
                salaryRange,
                location,
                employment: normalizedEmployment,
                workTypes: ['Remote'],
                isExternal: true,
                status: true,
                profilePic: "remoteok",
                batchUID,
                createdAt: postingTime
            });

            //delay so it wont overwhelm their servers
            await sleep(1000 + Math.random() * 2000); // Delay 0.5–2 seconds between jobs
        }

        console.log(data);


        // fs.writeFileSync('remoteok_jobs.json', JSON.stringify(data, null, 2), 'utf-8');
        // console.log("Data saved to remoteok_jobs.json");

        console.log(' - ----------------------NUMBER OF JOBS :', data.length);
        console.log("Worked properly");
        return (data)
    } catch (err) {
        console.log("Error Occured", err);
    } finally {
        await sleep(5000)
        await driver.quit();
    }
}



//------------------------------- RED FLAG -- if like job contains "Senior etc"

const REDFLAG_KEYWORDS = [
    'senior',
    'sr.',
    'lead',
    'manager',
    'principal',
    'director',
    'head of',
    'vp',
    'chief',
    'architect'
];

function containsRedFlag(title, description, tags) {
    const text = (title + ' ' + description + ' ' + tags.join(' ')).toLowerCase();
    return REDFLAG_KEYWORDS.some(keyword => text.includes(keyword));
}


// ---------------------------------------- DESCRIPTION CLEANER :D ----

function cleanDescription(rawDesc) {
    if (!rawDesc) return "";

    // Unescape newline and tab characters
    let cleaned = rawDesc.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

    // Decode &nbsp; to space
    cleaned = cleaned.replace(/&nbsp;/g, ' ');

    // Replace <br> tags with newline
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

    // Replace </p> tags with double newline
    cleaned = cleaned.replace(/<\/p>/gi, '\n\n');

    // Remove all other HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // Collapse excessive consecutive newlines to max two
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Collapse multiple spaces but keep newlines intact
    cleaned = cleaned.replace(/[ ]{2,}/g, ' ');

    // Trim leading and trailing whitespace/newlines
    return cleaned.trim();
}





//salary parser

// ---------------------------------------- SALARY CLEANER / PARSER CONVERTER  :D ----
const USD_TO_PHP = 56;

function parseSalary(salaryStr) {
    if (!salaryStr || !salaryStr.includes('$'))
        return {
            min: null,
            max: null,
            currency: null,
            frequency: null
        };

    // Extract amounts and frequency
    // Normalize string, remove emoji & commas
    const cleanStr = salaryStr.replace(/[^\d\-kKmMyY\/\s$]/g, '').replace(/,/g, '').toLowerCase();

    // Regex to find min and max (supports k as thousands)
    const rangeMatch = cleanStr.match(/\$?(\d+(?:\.\d+)?)(k)?(?:\s*-\s*\$?(\d+(?:\.\d+)?)(k)?)?/);

    if (!rangeMatch) return {
        min: null,
        max: null,
        currency: 'PHP',
        frequency: null
    };

    let min = parseFloat(rangeMatch[1]);
    if (rangeMatch[2] === 'k') min *= 1000;

    let max = rangeMatch[3] ? parseFloat(rangeMatch[3]) : null;
    if (rangeMatch[4] === 'k') max *= 1000;

    // Detect frequency: yearly (default), monthly, hourly from string
    let frequency = 'yearly';
    if (/per\s*month|\/month|monthly|mo/.test(cleanStr)) frequency = 'monthly';
    else if (/per\s*hour|\/hr|hourly|hr/.test(cleanStr)) frequency = 'hourly';

    // Convert USD to PHP (assume original currency is USD)
    min = min ? Math.round(min * USD_TO_PHP) : null;
    max = max ? Math.round(max * USD_TO_PHP) : null;

    return {
        min,
        max,
        currency: 'PHP',
        frequency
    };
}


//----------------------------------- INDUSTRY PARSER


function cosineSimilarity(vecA, vecB) {
    return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}


async function getEmbeddingVector(text) {
    const extractor = await getExtractor();
    const embeddings = await extractor(text, {
        pooling: 'mean'
    });

    const vec = embeddings.data ? embeddings.data[0] : embeddings;
    return Array.from(embeddings.data);
}

async function embedIndustries(industries) {
    const embedded = {};
    for (const [key, text] of Object.entries(industries)) {
        embedded[key] = await getEmbeddingVector(text);
    }
    return embedded;
}

async function classifyJob(jobTitle, skills) {
    const industries = {
        "Virtual Assistance / BPO / Online Support": "virtual assistant bpo online support remote calls customer service",
        "Technical Support / IT Support": "helpdesk tech support troubleshooting networks hardware",
        "Information Technology (Internships / Fresh Grad)": "software engineering programming tech internships cs backend frontend devops cloud",
    };

    console.log(jobTitle, 'jobtitle', skills, 'skills');

    const embeddedIndustries = await embedIndustries(industries);

    const targetText = [jobTitle, ...skills].join(' ');
    const targetVec = await getEmbeddingVector(targetText);

    let bestIndustry = null;
    let bestScore = -Infinity;

    for (const [industry, indVec] of Object.entries(embeddedIndustries)) {
        const score = cosineSimilarity(targetVec, indVec);
        console.log(`Similarity with ${industry}:`, score.toFixed(4));
        if (score > bestScore) {
            bestScore = score;
            bestIndustry = industry;
        }
    }

    console.log("Best Score:", bestScore.toFixed(4));
    return bestIndustry;
}





// ---------------------------------------- LOCATION CLEANER/ PARSER  :D ----

function parseLocation(rawLocation) {
    if (!rawLocation) return null;

    const lower = rawLocation.trim().toLowerCase();
    // List of vague location keywords to treat as null
    const vagueKeywords = ['remote', 'worldwide', 'anywhere', 'open', 'any location', 'global', 'n/a', 'unspecified', ''];

    if (vagueKeywords.some(k => lower.includes(k))) {
        return null;
    }

    // For demo, parse by commas (common format: City, Province, Country)
    const parts = rawLocation.split(',').map(s => s.trim());

    // Heuristic: assign from right to left: last=country, preceding=province, preceding=city
    const len = parts.length;
    const country = len > 0 ? parts[len - 1] : null;
    const province = len > 1 ? parts[len - 2] : null;
    const city = len > 2 ? parts[len - 3] : null;

    // If only display_name or country exists, others null
    return {
        display_name: rawLocation,
        city: city || null,
        province: province || null,
        country: country || null,
        postalCode: null, // no postal code info from RemoteOK UI
        lat: null,
        long: null
    };
}

// ---------------------------------------- EMPLOYMENT PARSER  :D ----

const EMPLOYMENT_TYPES = [{
        id: 1,
        type: "Full-time",
        keywords: ["full-time", "full time", "permanent"]
    },
    {
        id: 2,
        type: "Part-time",
        keywords: ["part-time", "part time"]
    },
    {
        id: 3,
        type: "Contract",
        keywords: ["contract"]
    },
    {
        id: 4,
        type: "Freelance",
        keywords: ["freelance", "freelancer"]
    },
    {
        id: 5,
        type: "Internship",
        keywords: ["internship", "intern"]
    },
    {
        id: 6,
        type: "OJT (On the job training)",
        keywords: ["ojt", "on the job training"]
    },
    {
        id: 7,
        type: "Volunteer",
        keywords: ["volunteer"]
    },
];

function extractEmployment(description) {
    if (!description) return [];
    const descLower = description.toLowerCase();
    const foundTypes = [];

    EMPLOYMENT_TYPES.forEach(({
        type,
        keywords
    }) => {
        for (const keyword of keywords) {
            if (descLower.includes(keyword)) {
                foundTypes.push(type);
                break;
            }
        }
    });

    return foundTypes.length > 0 ? foundTypes : null;
}

//------------------------------- end of JOB SCRAPER























//------------ POSTING JOBS ENDPOINT
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



// for external
exports.postJobsExternal = async (req, res) => {
    try {
        const extractor = await getExtractor();

        // Make sure data is always an array
        const jobs = Array.isArray(req.body) ? req.body : [req.body];

        const payloads = [];

        for (const job of jobs) {
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
                createdAt,
                link,
                batchUID
            } = job;

            // Normalize
            const cleanTitle = norm(jobTitle);

            // Vectorize
            let emb = await extractor(cleanTitle, {
                pooling: "mean",
                normalize: true
            });

            const payload = {
                _id: jobUID,
                jobUID,
                batchUID,
                companyName,
                jobTitle,
                jobNormalized: cleanTitle,
                jobTitleVector: Array.from(emb[0].data),
                jobIndustry,
                jobDescription,
                jobSkills,
                employment,
                workTypes,
                salaryRange,
                location,
                isExternal: true,
                status: true,
                profilePic,
                link,
                createdAt: new Date(createdAt),
                scrapedDate: new Date(),
                updatedAt: new Date()
            };

            payloads.push(payload);
        }

        // Insert all jobs at once
        const result = await mongoose.connection.db
            .collection("job_listings")
            .insertMany(payloads);

        res.json({
            success: true,
            insertedCount: result.insertedCount,
            insertedIds: result.insertedIds,
            payloads
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
};


//getting scrape batches

exports.getScrapeBatches = async (req, res) => {
    try {
        const batches = await ScrapeBatchSchema.find()

        res.json({
            success: true,
            data: batches
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
}


exports.getScrapeBatch = async (req, res) => {
    try {
        const {
            batchUID
        } = req.query
        console.log(batchUID, 'batchUID');
        const batches = await ScrapeBatchSchema.findOne({
            batchUID: batchUID
        })

        res.json({
            success: true,
            data: batches
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
}

//getting the scraped jobs
exports.getScrapeJobs = async (req, res) => {
    try {
        const {
            batchUID
        } = req.query
        console.log(batchUID, 'batchUID');
        const batches = await joblistingsModel.find({
            batchUID: batchUID
        })

        res.json({
            success: true,
            data: batches
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
}

//getting all of the scrapd jobs
exports.getAllScrapedJobs = async (req, res) => {
    try {
        const jobs = await joblistingsModel.aggregate([{
                $match: {
                    isExternal: true
                }
            },
            {
                $lookup: {
                    from: "job_interactions", // collection name
                    localField: "jobUID", // field in job_listings
                    foreignField: "jobUID", // field in job_interactions
                    as: "interactions"
                }
            },
            {
                $addFields: {
                    interactionCount: {
                        $size: "$interactions"
                    }
                }
            },
            {
                $project: {
                    jobTitleVector: 0, // exclude this
                    interactions: 0 // hide raw interactions array
                }
            }
        ]);

        res.json({
            success: true,
            data: jobs
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
}

//deleting scrape jobs
exports.deleteScrapeJob = async (req, res) => {
    try {
        const { jobUID } = req.query;

        if (!jobUID) {
            return res.status(400).json({ error: "jobUID is required" });
        }

        const deleted = await joblistingsModel.findOneAndDelete({ jobUID });

        if (!deleted) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.json({
            success: true,
            message: `Job ${jobUID} deleted successfully`,
            deletedJob: deleted
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

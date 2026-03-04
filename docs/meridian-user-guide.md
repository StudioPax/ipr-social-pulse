# MERIDIAN — User Guide for the IPR Marketing Team

*Your AI-powered companion for understanding, planning, and amplifying IPR research across every channel.*

---

# Welcome to MERIDIAN

MERIDIAN is a platform built specifically for the IPR marketing and communications team. It helps you answer three questions that come up every week:

1. **What's working?** — Which of our social posts are actually reaching the right people?
2. **What's being missed?** — Which important research is flying under the radar?
3. **What should we do next?** — When new research comes out, how do we message it across channels for maximum impact?

MERIDIAN doesn't replace your judgment or your expertise. It gives you structured data, AI-assisted analysis, and a planning framework so you can make faster, more confident decisions about where to invest your communications energy.

Think of it as a research assistant that never sleeps — one that understands IPR's five policy pillars, knows how to evaluate strategic framing, and can help you draft a multi-channel campaign in minutes instead of hours.

---

# The Big Picture: What MERIDIAN Does

MERIDIAN works in a cycle. Each part of the cycle builds on the one before it:

```
    COLLECT                      ANALYZE
    Pull in posts from       AI reads every post and
    IPR's social accounts    tags it: which pillar,
    across platforms.        how it's performing,
         |                   who it's for.
         |                        |
         v                        v
    ┌─────────────────────────────────────┐
    |                                     |
    |          MERIDIAN CYCLE             |
    |                                     |
    └─────────────────────────────────────┘
         ^                        |
         |                        v
    CAMPAIGNS                  OUTREACH
    Plan new content from      Track who's amplifying
    research papers with       IPR's work: journalists,
    audience-specific          policymakers, peer
    messaging.                 institutions.
```

Everything flows into the **Dashboard**, which gives leadership a clear picture of IPR's social media landscape at any moment.

Here's what each piece does and why it matters:

## Collect — Gathering What's Out There

This is the starting point. MERIDIAN connects to IPR's social media accounts (currently Bluesky, with Twitter/X, LinkedIn, Facebook, and Instagram coming soon) and pulls in posts within a date range you select.

**What it does for you:** No more manually scrolling through feeds or exporting spreadsheets from each platform. One click, all posts, normalized into a single view.

**What it doesn't do:** It only collects posts from accounts you've connected. It doesn't scrape other people's posts or do anything that violates platform terms of service.

## Analyze — Understanding What's Working (and What's Not)

This is where the AI comes in. After collection, you run an analysis pass. MERIDIAN sends your posts (in batches) to an AI model, which reads each one and classifies it across several dimensions.

We'll go deeper into how all the scoring works in the "How the AI Works" section below — but at a high level, the analysis tells you:

- Which **policy pillar** does this post align with?
- What's the **sentiment** — and is the post's tone landing the way we intended?
- How is it **performing** relative to engagement and policy relevance?
- Who is the **audience** this post best serves?
- How strong is the **strategic framing** according to FrameWorks Institute methodology?
- What should we **do next** with this post?

**What it does for you:** Turns a spreadsheet of posts into a strategic intelligence layer. Instead of scrolling and guessing, you can filter to "show me all Health-pillar posts that are under-amplified but policy-relevant" and find your hidden gems in seconds.

## Campaigns — Planning New Content from Research

This is the proactive side of MERIDIAN. When new IPR research is published, you can create a **Content Campaign** — a project-style workspace for planning how to message that research across every channel and audience.

A campaign is built around a **document collection**, similar to how you might set up a project in Claude or Google Drive:

| Document | Who Creates It | Role |
|----------|---------------|------|
| **Research Paper** | Faculty | The core source — the published paper, working paper, or report |
| **Research Notes** | IPR Marketing | Your curated summary — what you *want* to communicate. This is the primary input for AI strategy generation |
| **AI Brief** (optional) | AI-generated | A condensed summary of the paper. Useful for long or dense papers. You review and correct it before it's used |
| **Supporting Documents** | Anyone | Interview transcripts, data visualizations, fact sheets, prior research — anything that adds context |

The key design principle: **your team owns comprehension, the AI owns strategy.** You read the research, talk to the PI, and write the research note that captures what matters. The AI then takes your verified inputs and generates audience-specific narratives, channel-adapted content, FrameWorks-informed framing, and timing recommendations.

**What it does for you:** Cuts the "how do we message this?" brainstorm from hours to minutes. You still make every decision — the AI gives you a strong starting draft and strategic framework to work from.

## Outreach — Tracking Who's Listening

*(Coming soon)* Once posts are published, the Outreach module tracks the next ring of engagement: who quoted, reposted, or cited IPR's work? Are journalists picking it up? Did a policymaker reference it?

**What it does for you:** Surfaces the real-world impact of your communications work — the kind of evidence that matters in reports to leadership and funders.

## Dashboard — The View from Above

The Dashboard pulls everything together into visual summaries designed for different audiences:

- **Leadership view:** High-level trends, top-performing content, pillar distribution — the "state of the union" for IPR social
- **NU Alignment view:** How IPR's work maps to Northwestern-wide strategic priorities (Feinberg, Trienens, AI/Data)
- **Opportunity view:** Under-amplified research, pillar gaps, and recommended next actions — the "what should we focus on" view

---

# Core Concepts

These are the frameworks built into MERIDIAN. Understanding them will help you get the most out of every feature.

## The Five Policy Pillars

Every piece of IPR content maps to at least one of IPR's five policy pillars. MERIDIAN's AI assigns a primary pillar (and sometimes a secondary one) to each post based on its content.

| Pillar | What It Covers |
|--------|---------------|
| **Health** | Health policy, public health, healthcare systems, biomedical research |
| **Democracy** | Democratic institutions, governance, civic engagement, voting, political behavior |
| **Methods** | Research methods, data science, computational approaches, statistics, surveys |
| **Opportunity** | Economic opportunity, inequality, social mobility, education, labor markets |
| **Sustainability** | Environmental policy, climate change, energy, urban planning |

**Why this matters:** Pillar tagging lets you see at a glance whether your social presence is balanced across IPR's mission, or whether certain pillars are getting more attention than others.

## Performance Tiers

MERIDIAN places every analyzed post into one of four performance tiers. This is the intersection of two things: *how much engagement did it get?* and *how policy-relevant is the content?*

| Tier | Name | What It Means |
|------|------|--------------|
| **T1** | Policy Engine | High engagement AND high policy relevance. This is the gold standard — content that's both reaching people and advancing IPR's mission. |
| **T2** | Visibility | High engagement but moderate policy relevance. It's popular, but it might not be doing the heavy lifting for IPR's policy goals. Still valuable — good models for format and tone. |
| **T3** | Niche | Low engagement but high policy relevance. These are your "hidden gems" — important research that isn't getting the audience it deserves. Prime candidates for promotion. |
| **T4** | Underperformer | Low engagement and low policy relevance. Worth investigating — is the topic off-mission, or is the framing not connecting? |

**The sweet spot:** T1 is where you want to be. T3 posts are your biggest opportunity — they represent important work that needs a communications boost.

## Recommended Actions

Based on the tier, MERIDIAN suggests a next step for each post:

| Action | When It's Suggested | What It Means |
|--------|-------------------|--------------|
| **Amplify** | T1 posts | This is already working. Boost it, cross-post it, share it wider. |
| **Template** | T2 posts | The format is effective. Study what's working here and apply it to policy-relevant content. |
| **Promote Niche** | T3 posts | Important research that needs more visibility. Invest in promoting this. |
| **Diagnose** | T4 posts | Something isn't clicking. Investigate whether the issue is timing, framing, audience, or topic. |
| **Archive** | Very low relevance | This post isn't aligned with IPR's mission. Note it and move on. |

## Audience Segments

MERIDIAN identifies the best-fit audience for each post, which helps you understand who your content is reaching:

| Audience | Who They Are |
|----------|-------------|
| **Policymaker** | Government officials, legislators, legislative staff, think tank analysts |
| **Faculty** | NU faculty, peer researchers, graduate students |
| **Donor** | Foundations, individual philanthropists, corporate partners |
| **Public** | General citizens, students, community members |
| **Media** | Journalists, editors, podcast producers |
| **NU Leadership** | Provost, deans, NU-wide communications (used in Campaigns) |

## Northwestern Alignment Tags

Posts can also be tagged with Northwestern-wide strategic alignment areas:

- **Feinberg** — Feinberg School of Medicine connections
- **Trienens** — Trienens Institute for Sustainability connections
- **AI/Data** — AI and data science initiatives

This is especially useful for the NU Alignment dashboard view and for demonstrating IPR's contribution to university-wide priorities.

---

# How the AI Works

We believe in transparency about how MERIDIAN's AI makes its assessments. Here's what's happening under the hood — no computer science degree required.

## The AI Models

MERIDIAN currently supports two AI models. You choose which one to use for each analysis run:

- **Claude** (by Anthropic) — `claude-sonnet-4`. This is the default and recommended model.
- **Gemini** (by Google) — `gemini-3-pro-preview`. An alternative if you prefer.

Both models receive the same instructions and produce the same structured output. The choice is yours — some teams prefer one model's style over the other.

**Your API keys are stored securely** in MERIDIAN's database, associated with your IPR client profile. They never leave the server and are never exposed in the browser.

## What the AI Reads

### For Post Analysis (Analyze module)

When you run an analysis, the AI receives each post's:
- Full text content
- Platform (Bluesky, Twitter, etc.)
- Publication date
- Total engagement count (likes + reposts + comments)
- Hashtags
- Post URL

It does NOT receive your name, your login credentials, any private messages, or anything outside the public posts you've collected.

### For Campaign Strategy (Campaigns module)

When you generate a campaign strategy, the AI reads your campaign's document collection in a specific priority order:

1. **Research Notes** (your curated summary) — this is the primary input
2. **AI Brief** (if you generated one) — condensed paper summary
3. **Supporting Documents** — transcripts, fact sheets, etc.
4. **Research Paper** — the original paper, included as reference context

Your Research Notes carry the most weight. This is by design — the AI treats your team's curated understanding as the source of truth for messaging, not its own interpretation of the paper.

## What the AI Produces

### Post Analysis Scores

For each post, the AI returns a structured assessment with numerical scores and written rationales. Here's what each score means:

**Pillar Confidence (0.0 - 1.0)**

How confident the AI is in its pillar assignment.
- **0.8 - 1.0:** Strong match. The post clearly aligns with this pillar.
- **0.5 - 0.8:** Moderate match. The post touches on this pillar but could also fit others.
- **Below 0.5:** Weak match. The post doesn't strongly align with any specific pillar.

The AI also provides a **pillar rationale** — a sentence or two explaining why it chose this pillar.

**Sentiment Score (-1.0 to +1.0) and Label**

Here's something important: **MERIDIAN judges sentiment by communicative intent, not by topic.**

A post that says "New research reveals alarming rates of childhood poverty" is **not** negative — the intent is to promote important IPR research. The topic is concerning, but the post itself is doing something positive (sharing scholarship).

Sentiment is only classified as negative when the post's own tone is negative — for example, expressing frustration about funding cuts or reporting an institutional setback.

| Label | Score Range | What It Means |
|-------|------------|--------------|
| Positive | +0.3 to +1.0 | The post is celebratory, promotional, or affirming |
| Neutral | -0.3 to +0.3 | The post is informational or balanced |
| Negative | -1.0 to -0.3 | The post's own tone expresses concern, criticism, or disappointment |
| Mixed | Varies | The post genuinely contains conflicting sentiments |

The AI also provides a **sentiment rationale** explaining its reasoning.

**Policy Relevance (0.0 - 1.0)**

How directly this post connects to IPR's policy mission.
- **0.8 - 1.0:** Directly advancing policy understanding or advocacy.
- **0.4 - 0.8:** Related to policy but not the primary focus (e.g., an event announcement that involves policy research).
- **Below 0.4:** Tangentially related or off-mission (e.g., a general congratulations post).

This score, combined with engagement, determines the performance tier.

**FrameWorks Institute Analysis (1-5 per dimension, 5-25 overall)**

This is one of MERIDIAN's most distinctive features. Every post is evaluated against the FrameWorks Institute's strategic communications methodology — the same framework used by leading nonprofits and social impact organizations.

Five dimensions are scored from 1 (weakest) to 5 (strongest):

| Dimension | What It Measures | A "5" Looks Like | A "1" Looks Like |
|-----------|-----------------|-----------------|-----------------|
| **Values Lead** | Does it open with a shared value? | "Every child deserves the chance to thrive..." | "Statistics show a 23% increase in..." |
| **Causal Chain** | Does it explain systemic causes? | "...because our tax system is designed in a way that..." | "...people need to make better choices..." |
| **Cultural Freight** | Does it avoid harmful frames? | Avoids words like "deserving," "handout," "welfare" | Accidentally triggers bootstrap or charity mindsets |
| **Episodic vs. Thematic** | Does it connect stories to systems? | Bridges a family's story to policy design | Tells an individual story with no structural context |
| **Solutions Framing** | Does it give the audience agency? | "Communities can act by contacting their representatives..." | Leaves the audience with passive sympathy |

**Overall score** is the sum of all five dimensions (out of 25). The AI also provides a **rewrite recommendation** — one specific, actionable suggestion to improve the post's strategic framing.

**Why this matters:** This gives you a communications quality score grounded in research, not just vibes. Over time, you can track whether IPR's framing is improving, and identify which types of content consistently score higher.

### Campaign Strategy Output

When you generate a campaign strategy, the AI produces:

- **Key Messages** — 3-5 core messages extracted from your research notes, framed using FrameWorks values-led methodology
- **Pillar Mapping** — which IPR pillars this research aligns with and why
- **Audience Narratives** — for each target audience (policymakers, faculty, donors, media, public), a tailored narrative angle explaining why this research matters to them
- **Channel Plans** — for each selected channel (LinkedIn, Twitter, Bluesky, website, newsletter, etc.), draft content adapted to that platform's format, tone, and constraints
- **FrameWorks Evaluation** — each channel draft is scored on the same 5-dimension framework used in post analysis
- **Timing Recommendations** — suggested posting schedule considering embargo dates, news cycles, and content sequencing

## What the AI Does NOT Do

- It does not post anything on your behalf
- It does not access your social media accounts directly (MERIDIAN's Collect module does that through official APIs)
- It does not make final decisions — every assessment is a recommendation that your team reviews
- It does not store or learn from your data for other purposes — each analysis is independent
- It does not replace editorial judgment — it augments it with structured data
- It does not interpret the research paper for you — that's your job (and your strength)

---

# How to Use MERIDIAN: Step by Step

## Your Regular Workflow

Here's what a typical week with MERIDIAN looks like:

### Monday: Collect & Analyze

1. Open MERIDIAN and go to **Collect**
2. Select your platforms and date range (or use a preset like "Last 7 days")
3. Click **Run Collection** — watch the log as posts are pulled in
4. Go to **Analyze**
5. Click **Pre-Scan** to see how many new posts need analysis
6. Select your AI model and click **Run Analysis** — the streaming log shows progress in real time
7. When complete, your posts table is populated with pillar tags, sentiment, tiers, and FrameWorks scores

### Tuesday - Thursday: Review & Act

1. Use the **Filter Bar** on the Analyze page to slice your data:
   - Filter by pillar to check balance across IPR's mission areas
   - Filter by tier to find T3 "hidden gems" (high relevance, low engagement)
   - Filter by sentiment to spot any posts landing differently than intended
   - Sort by FrameWorks overall score to find your best and worst framing examples
2. **Expand any row** to see the full analysis detail: rationale, key topics, research linkage, NU alignment tags, and the FrameWorks dimension breakdown
3. Act on the recommended actions:
   - **Amplify** T1 posts by cross-posting or boosting
   - **Study** T2 posts as templates for future content
   - **Promote** T3 posts that deserve more visibility
   - **Investigate** T4 posts to understand what's not connecting

### When New Research Drops: Create a Campaign

You have two paths depending on where you are in the process:

**Path A: You've already written the research note (recommended)**

1. Go to **Campaigns** and click **+ New Campaign**
2. Name the campaign and fill in the research metadata (authors, DOI, publication date, embargo date)
3. Upload or paste the **research paper** — this is your core reference document
4. Paste your **Research Notes** — the accessible summary your team has written. This is the most important input
5. Optionally add **supporting documents** — interview transcripts, data viz descriptions, fact sheets
6. Select your **target audiences** and **channels**
7. Click **Generate Strategy** — the AI reads your document collection (prioritizing your Research Notes) and produces:
   - Key messages framed with FrameWorks methodology
   - Audience-specific narrative angles
   - Channel-by-channel draft content with FrameWorks scores
   - Timing and sequencing recommendations
8. Review and edit the campaign brief
9. Approve channel plans and schedule content
10. After publishing, link the live posts back to the campaign to track performance

**Path B: The paper just dropped and you need help getting started**

1. Go to **Campaigns** and click **+ New Campaign**
2. Upload or paste the **research paper**
3. Click **Generate AI Brief** — the AI produces a condensed, structured summary of the paper
4. **Review and correct** the AI Brief — this is important. The AI may miss nuance or flatten complex arguments. Your editorial review ensures accuracy
5. Use the AI Brief as a starting point to write or refine your **Research Notes**
6. Add any supporting documents
7. Select audiences and channels, then click **Generate Strategy**
8. Continue from step 8 in Path A

Both paths converge at strategy generation. The AI always uses your Research Notes as the primary input — the brief and paper provide supporting context.

### Friday: Report

1. Open the **Dashboard**
2. The **Leadership view** gives you the executive summary — share this with Andy and Francesca
3. The **NU Alignment view** shows how IPR's work connects to university priorities — useful for provost-level conversations
4. The **Opportunity view** shows you where to focus next week

## Tips for Getting the Most Out of MERIDIAN

**Start with the T3 posts.** These are your biggest quick wins — important research that isn't reaching people. The AI has already identified them for you.

**Use FrameWorks scores to improve over time.** Track your average FrameWorks overall score month-over-month. It's a concrete way to show that IPR's communications quality is improving.

**Invest in your Research Notes.** The AI's campaign output is only as good as the input you give it. A well-written research note that captures the key findings, the "so what," and the audience implications will produce dramatically better strategy than a bare abstract.

**Don't over-edit campaign drafts.** The AI produces first drafts grounded in FrameWorks methodology and audience research. Sometimes the best move is to lightly edit for voice and publish quickly, rather than rewriting from scratch.

**Compare campaigns.** After a few campaigns, you'll start to see patterns — which audiences respond to which kinds of research, which channels perform best for which pillars.

**Re-analyze periodically.** Posts older than 30 days with significant engagement changes are flagged as "stale." Running a re-analysis on stale posts updates their tier based on how engagement has evolved.

---

# Understanding Your Dashboard

## KPI Cards

At the top of the dashboard, you'll see summary cards:

- **Total Posts** — how many posts are in the system for the selected period
- **Avg. Engagement Rate** — the mean engagement rate across all posts
- **Top Pillar** — which pillar has the most content
- **Sentiment Breakdown** — the proportion of positive/neutral/negative posts

## Pillar Distribution

A donut chart showing how your content breaks down across the five pillars. Look for:
- **Imbalances** — is one pillar dominating while others are neglected?
- **Alignment with IPR priorities** — does the distribution match where IPR wants to invest?

## Performance Tier Mix

A bar chart showing how many posts fall into each tier. Ideally:
- T1 (Policy Engine) should be growing over time
- T3 (Niche) represents opportunity — these deserve promotion
- T4 (Underperformer) should be shrinking as framing improves

## Sentiment Trend

A line chart showing sentiment over time. Because MERIDIAN measures communicative intent (not topic negativity), a consistently positive sentiment means your posts are effectively promoting IPR's work in an affirming, constructive way.

---

# Glossary

| Term | Definition |
|------|-----------|
| **Pillar** | One of IPR's five policy research areas: Health, Democracy, Methods, Opportunity, Sustainability |
| **Tier** | Performance classification (T1-T4) based on engagement + policy relevance |
| **Policy Relevance** | A 0-1 score indicating how directly a post connects to IPR's policy mission |
| **Sentiment** | The communicative intent of a post — is the post itself positive, neutral, or negative in tone? (Not the topic) |
| **FrameWorks Score** | A 5-25 score evaluating strategic communications quality across five dimensions from the FrameWorks Institute methodology |
| **Engagement Total** | The sum of likes, reposts, comments, and other interactions on a post |
| **Campaign** | A project-style workspace for planning how to message a piece of IPR research across multiple channels and audiences |
| **Document Collection** | The set of documents attached to a campaign — research paper, research notes, AI brief, and supporting materials |
| **Research Notes** | IPR marketing's curated summary of a research paper — the primary human-authored input that drives AI strategy generation |
| **AI Brief** | An optional AI-generated condensed summary of a research paper, reviewed and corrected by the team before use |
| **Channel Plan** | A per-channel content recommendation within a campaign, including draft copy, target audience, and scheduling |
| **Amplifier** | A person or organization that shares, quotes, or cites IPR content — tracked by the Outreach module |
| **NU Alignment** | How a post connects to Northwestern-wide strategic priorities (Feinberg, Trienens, AI/Data) |
| **SSE Stream** | The real-time log you see during collection and analysis — it shows you exactly what the system is doing as it works |
| **Prescan** | The quick check before analysis that counts how many posts are new, current, or stale — so you know what you're about to analyze |

---

# Frequently Asked Questions

## General

**What does "MERIDIAN" stand for?**
MERIDIAN is the platform name — like a meridian line that connects and maps things across a landscape. It reflects the platform's purpose: mapping IPR's research presence across the social media landscape and connecting it to strategic goals.

**Who is MERIDIAN built for?**
The IPR marketing and communications team — Patricia, Lex, Lily, and anyone involved in IPR's social media strategy. The dashboard is also designed for sharing with leadership (Andy, Francesca) and NU-wide stakeholders.

**Do I need to be technical to use it?**
Not at all. MERIDIAN is designed for communications professionals. If you can use a spreadsheet and social media, you can use MERIDIAN. The AI does the heavy analytical lifting; you make the strategic decisions.

## About the AI

**Is the AI making decisions for us?**
No. MERIDIAN's AI is an analysis and drafting tool. It classifies posts, scores them, and generates draft content — but every output is a recommendation. Your team reviews, edits, and decides what to act on.

**How accurate is the AI's pillar tagging?**
In our testing, the AI's pillar assignments align with human judgment the vast majority of the time. Each assignment comes with a confidence score and a written rationale, so you can quickly assess whether you agree. If the AI gets one wrong, the analysis for that post can be updated on the next run.

**Can the AI see our private messages or internal documents?**
No. The AI only processes the public social media posts that you've explicitly collected and the campaign documents you've uploaded or pasted. It has no access to email, Slack, internal documents, or anything else.

**Why does the AI sometimes classify a post about a sad topic as "positive"?**
This is by design. MERIDIAN measures the *communicative intent* of the post, not the nature of the topic. A post that says "Alarming new findings on racial bias in healthcare" is *promoting IPR research* — that's a positive action, even though the topic is concerning. Sentiment is only "negative" when the post itself expresses frustration, criticism, or disappointment.

**What if I disagree with the AI's assessment?**
That's expected and healthy. The AI provides a structured starting point. If you disagree with a pillar assignment or sentiment classification, trust your expertise. The AI's value is in processing hundreds of posts quickly and consistently — the edge cases are where your human judgment is essential.

**Is our data being used to train the AI?**
No. Both Claude and Gemini's API terms state that data sent through the API is not used for model training. Your posts go in, the analysis comes back, and nothing is retained by the AI provider.

## About Campaigns

**Why does MERIDIAN ask for my Research Notes instead of just analyzing the paper?**
LLMs are powerful, but they can struggle with dense academic papers — missing methodology nuance, hallucinating statistics, or flattening complex arguments. Your Research Notes represent what the IPR team *actually wants to communicate*, based on reading the paper, talking to the PI, and applying institutional knowledge. The AI excels at taking your verified understanding and generating multi-audience, multi-channel strategy from it.

**What's the AI Brief and do I need it?**
The AI Brief is an optional tool. If a paper is long or complex and you want a condensed starting point before writing your Research Notes, you can ask the AI to generate a structured summary. But it's strictly optional — if you already have your Research Notes ready, skip it and go straight to strategy generation.

**When should I create a campaign vs. just posting?**
Create a campaign when you have a meaningful piece of research that deserves a coordinated, multi-channel rollout — especially if it involves multiple audiences, embargo considerations, or faculty engagement. For routine posts (event reminders, quick shares), you don't need a campaign.

**Can I add documents to a campaign after creating it?**
Yes. You can add, remove, or update documents at any time. You can also toggle documents on or off to include or exclude them from AI context without deleting them. If you add a new document and want it reflected in the strategy, just re-run strategy generation.

**Can I edit the AI-generated draft content?**
Absolutely — and you should. The AI produces a strong first draft grounded in FrameWorks methodology and audience awareness, but your knowledge of IPR's voice, current context, and relationships is irreplaceable. Think of the AI draft as a brief from a junior strategist that you refine with your experience.

**What happens after I publish content from a campaign?**
You can link the published post back to the campaign channel plan. On the next Collect run, MERIDIAN picks up the live post. Analyze classifies it. Outreach tracks who amplified it. The campaign's performance section then shows you how the strategy actually performed — closing the loop.

**Can multiple people work on the same campaign?**
Yes. Campaigns are saved in the database, and any team member with MERIDIAN access can view and edit them. We recommend having one person "own" each campaign to avoid conflicting edits.

## About Scoring

**How are performance tiers calculated?**
Tiers use two inputs:
- **Engagement total** (likes + reposts + comments + other interactions) — threshold is 20
- **Policy relevance score** (0-1, determined by AI) — threshold is 0.6

The combination creates a 2x2 matrix:
- High engagement + High relevance = **T1 (Policy Engine)**
- High engagement + Lower relevance = **T2 (Visibility)**
- Lower engagement + High relevance = **T3 (Niche)**
- Lower engagement + Lower relevance = **T4 (Underperformer)**

**What's a "good" FrameWorks score?**
The scale is 5-25. In practice:
- **20-25:** Excellent strategic framing. The post leads with values, explains systems, and gives the audience agency.
- **14-19:** Good framing with room for improvement. Check which individual dimensions scored low.
- **5-13:** The framing needs significant work. The rewrite recommendation will point to the most impactful change.

Most institutional social media content scores in the 12-18 range. Consistently hitting 18+ would put IPR in the top tier of research institution communications.

**Can the scoring thresholds be adjusted?**
Yes, by the development team. If IPR's engagement benchmarks shift (e.g., after growing your Twitter following significantly), the tier thresholds can be recalibrated. Talk to Studio Pax about adjustments.

## About Data & Privacy

**What platforms does MERIDIAN currently support?**
Currently: **Bluesky** (fully connected). Coming soon: Twitter/X, LinkedIn, Facebook, Instagram. Each platform requires API credentials that are configured in Settings.

**How often should I run collection?**
Weekly is a good cadence for most teams. MERIDIAN deduplicates automatically — if you collect overlapping date ranges, it won't create duplicate posts.

**Where is our data stored?**
In a Supabase database (PostgreSQL) hosted in the cloud with row-level security enabled. Only authenticated requests from the MERIDIAN app can access the data.

**Can other clients see our data?**
No. Every piece of data in MERIDIAN is scoped to your client ID. The platform is designed for multi-client use, but each client's data is completely isolated.

## Troubleshooting

**The analysis seems to be taking a long time.**
AI analysis processes posts in batches of 10, with a brief pause between batches to respect API rate limits. For 100 posts, expect roughly 2-3 minutes. The streaming log shows real-time progress so you know it's working.

**I got an error about an API key.**
Go to **Settings** and check that your Claude or Gemini API key is entered correctly. Use the **Test Connection** button to verify it's working before running an analysis.

**The prescan says "0 new posts" but I know there are new posts.**
Make sure you've run a **Collection** first. The analysis prescan only looks at posts already in MERIDIAN's database. If posts haven't been collected yet, they won't appear.

**A post got tagged with the wrong pillar.**
This can happen, especially with posts that span multiple policy areas. Check the pillar rationale in the expanded row to understand the AI's reasoning. On the next analysis run (or a "full" re-analysis), the AI will reassess.

---

# What's Next

MERIDIAN is actively being developed. Here's what's on the roadmap:

- **Twitter/X, LinkedIn, Facebook, Instagram connectors** — expanding beyond Bluesky to cover all of IPR's social presence
- **Outreach module** — tracking amplifiers, influencers, and policy citations
- **Campaign performance tracking** — the full feedback loop from plan to publish to measure
- **Google Sheets export** — one-click export for leadership reports
- **Email digest** — scheduled summary reports delivered to your inbox
- **Template library** — save successful campaigns as reusable templates

We'll update this documentation as new features roll out. If you have questions, suggestions, or run into any issues, reach out to Stephan at Studio Pax.

---

*MERIDIAN is built by Studio Pax for Northwestern IPR.*
*Documentation version 1.1 — March 2026*

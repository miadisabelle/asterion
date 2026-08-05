import { NextResponse } from 'next/server';
import { sql } from '@/lib/asterion/db';

// Seed documentation content
const SEED_PAGES = [
  {
    slug: 'what-is-asterion',
    title: 'What is Asterion?',
    title_explorer: 'Welcome to Asterion!',
    origin: 'academic',
    doc_type: 'concept',
    status: 'canonical',
    tags: ['overview', 'introduction', 'core'],
    sections: [
      {
        title: 'Introduction',
        title_explorer: 'The Big Picture',
        content: `Asterion is a recursive execution operating substrate designed for managing complex software development across distributed teams and repositories.

Unlike traditional project management tools that treat issues as flat task lists, Asterion understands software development as a living topology of structural tensions—gaps between current reality and desired outcomes that drive all meaningful progress.

### Core Philosophy

Asterion is built on Robert Fritz's structural tension methodology: the understanding that creative work advances not through willpower or problem-solving, but through the natural resolution of tension between where we are and where we want to be.

### Key Capabilities

- Structural Tension Charts: Model gaps between current reality and desired outcomes
- Telescoping: Recursive decomposition that preserves lineage
- Cross-Repository Orchestration: Projects as lenses across multiple repos
- Persistent Memory: Knowledge graph that survives context switches
- MMOT Evaluation: Self-witnessing correction loops`,
        content_explorer: `Imagine you're building a huge LEGO castle with friends who live in different houses. You need a way to:

- Remember what pieces everyone has
- Know which parts of the castle are finished
- Figure out what to build next
- Make sure nothing gets lost when you stop playing

Asterion is like a magical notebook that does all of this for building software!

### What Makes It Special?

Instead of just listing tasks like "build the tower," Asterion helps you think about:
- Where you are now (current reality)
- Where you want to be (desired outcome)
- The exciting gap between them (that's called "tension"!)

This gap is what makes building fun and keeps everyone moving forward.`,
        section_type: 'text',
        sort_order: 0
      },
      {
        title: 'The Seven Layers',
        title_explorer: 'The Seven Magical Layers',
        content: '',
        content_explorer: '',
        section_type: 'diagram',
        diagram_type: 'layer_map',
        diagram_code: `flowchart TB
  subgraph Operator["Operator Layer"]
    UI[Dashboard]
    API[API Surface]
  end
  subgraph Security["Security Layer"]
    Auth[Access Control]
    Audit[Audit Log]
  end
  subgraph Docs["Documentation Layer"]
    Specs[Specifications]
    Narratives[Narratives]
  end
  subgraph PDE["PDE Layer (Prompt Decomposition)"]
    Decomposition[Prompt Decomposition]
    Intents[Intents & Directions]
    Actions[Action Stacks]
  end
  subgraph Governance["Governance Layer"]
    Policies[Policies]
    Reviews[Reviews]
  end
  subgraph Memory["Memory Layer"]
    KG[Knowledge Graph]
    State[Persistent State]
  end
  subgraph Runtime["Runtime Layer"]
    Engine[Execution Engine]
    Agents[Agent Coordination]
  end
  
  Operator --> Security
  Security --> Docs
  Docs --> PDE
  PDE --> Governance
  Governance --> Memory
  Memory --> Runtime`,
        sort_order: 10
      },
      {
        title: 'Why Framing Matters',
        title_explorer: 'Why This is Different',
        content: `The way you frame a problem determines the solutions available to you. Asterion enforces Fritz methodology not as bureaucracy, but because decades of research show that structural tension framing produces better outcomes than problem-solving framing.

Problem-solving focuses on what's wrong and how to fix it. This creates reactive patterns and often just shifts problems around.

Structural tension focuses on what you want to create and honestly assesses where you are. This creates generative patterns that build toward vision.`,
        content_explorer: `Here's a secret: how you think about a problem changes what solutions you can find!

If you think "this is broken, I need to fix it," you'll only think about fixing.

But if you think "I want to build something amazing, and here's where I am now," suddenly you can imagine all sorts of creative paths forward!

Asterion helps you think this second way, which is much more powerful.`,
        section_type: 'callout',
        callout_type: 'why',
        sort_order: 20
      }
    ]
  },
  {
    slug: 'structural-tension',
    title: 'Structural Tension Methodology',
    title_explorer: 'Understanding Tension (The Good Kind!)',
    origin: 'academic',
    doc_type: 'concept',
    status: 'canonical',
    tags: ['tension', 'fritz', 'methodology', 'core'],
    sections: [
      {
        title: 'The Tension Chart',
        title_explorer: 'The Magic Gap',
        content: `A structural tension chart has three essential components:

1. **Desired Outcome**: A clear, specific vision of what you want to create. Not "make it better" but "users can complete checkout in under 30 seconds."

2. **Current Reality**: An honest assessment of where things stand right now. Not what you hope or fear, but what actually is.

3. **Structural Tension**: The gap between desired outcome and current reality. This gap creates natural energy that drives resolution.

### Why It Works

Tension seeks resolution. When you clearly hold both your vision and your current reality in mind, your creative process naturally generates paths forward. This is fundamentally different from problem-solving, which focuses only on what's wrong.`,
        content_explorer: `Think of a rubber band stretched between two fingers:

- One finger is where you are NOW
- Other finger is where you WANT TO BE
- The stretch in the middle? That's TENSION!

The rubber band naturally wants to pull together. Your brain works the same way—when you clearly see both where you are and where you want to be, ideas start flowing about how to get there!

That's the magic of structural tension.`,
        section_type: 'text',
        sort_order: 0
      },
      {
        title: 'Tension Chart Diagram',
        content: '',
        section_type: 'diagram',
        diagram_type: 'tension_chart',
        diagram_code: `flowchart LR
  subgraph Current["Current Reality"]
    C1[Where we are]
    C2[Constraints]
    C3[Resources]
  end
  
  subgraph Tension["Structural Tension"]
    T[Gap]
  end
  
  subgraph Desired["Desired Outcome"]
    D1[Where we want to be]
    D2[Success criteria]
    D3[Measurable result]
  end
  
  Current -->|creates| Tension
  Desired -->|creates| Tension
  Tension -->|resolves toward| Desired`,
        sort_order: 10
      }
    ]
  },
  {
    slug: 'telescoping',
    title: 'Telescoping: Recursive Decomposition',
    title_explorer: 'Zoom In, Zoom Out!',
    origin: 'technical',
    doc_type: 'concept',
    status: 'canonical',
    tags: ['telescoping', 'decomposition', 'recursion'],
    sections: [
      {
        title: 'What is Telescoping?',
        title_explorer: 'The Zoom Power',
        content: `Telescoping is Asterion's recursive decomposition model. When an action step within a tension becomes complex enough to warrant its own structural tension, it can "telescope" into a child tension while preserving its lineage.

### Key Properties

- **Lineage Preservation**: The source_action_step_id field links child tensions to their origin
- **Depth Tracking**: telescope_depth indicates how many levels deep a tension is
- **Bidirectional Navigation**: Navigate up to parents or down to children

### When to Telescope

Telescope when an action step:
- Has its own distinct desired outcome
- Requires multiple sub-steps
- Involves different stakeholders
- Needs independent tracking`,
        content_explorer: `Imagine you have a telescope that lets you zoom in on stars:

- Far away: You see the whole night sky (the big picture)
- Zoom in: You see a constellation (a group of related things)
- Zoom more: You see one star up close (the details)

Asterion works the same way with work:

- Big goal: "Build an amazing app"
- Zoom in: "Make the login screen"
- Zoom more: "Design the password field"

Each zoom level is its own little world, but they're all connected!`,
        section_type: 'text',
        sort_order: 0
      },
      {
        title: 'Telescoping Tree',
        content: '',
        section_type: 'diagram',
        diagram_type: 'telescope_tree',
        diagram_code: `flowchart TD
  R[Root Tension]
  R --> A1[Action Step 1]
  R --> A2[Action Step 2]
  R --> A3[Action Step 3]
  
  A2 -->|telescopes| T1[Sub-Tension]
  T1 --> S1[Sub-Step 1]
  T1 --> S2[Sub-Step 2]
  
  S1 -->|telescopes| T2[Deep Tension]
  T2 --> D1[Deep Step 1]
  T2 --> D2[Deep Step 2]
  
  style R fill:#3b82f6
  style T1 fill:#8b5cf6
  style T2 fill:#ec4899`,
        sort_order: 10
      }
    ]
  },
  {
    slug: 'projects-are-lenses',
    title: 'Projects Are Lenses',
    title_explorer: 'Projects: Your Special Glasses',
    origin: 'technical',
    doc_type: 'concept',
    status: 'canonical',
    tags: ['projects', 'orchestration', 'lenses'],
    sections: [
      {
        title: 'Cross-Repository Orchestration',
        title_explorer: 'Seeing Across Everything',
        content: `In Asterion, a Project is not a container—it's a lens. The same tension can appear in multiple projects, viewed through different perspectives.

### Why Lenses Matter

Traditional tools force you to choose: does this issue belong to Project A or Project B? But real work crosses boundaries. A security fix might be relevant to:
- The Security team's project
- The Release planning project
- The Compliance audit project
- The Technical debt project

With lenses, all of these can include the same tension without duplicating it.

### Project-Tension Relationships

The project_tensions junction table enables this:
- One tension, many project memberships
- Each membership can have its own lens (perspective label)
- Sort order is project-specific`,
        content_explorer: `Have you ever used colored glasses that make the world look different?

- Blue glasses: Everything looks blue
- Red glasses: Everything looks red
- Same world, different view!

Asterion projects work like glasses. The same piece of work can be seen through different "project glasses":

- Through "Security glasses": This is a safety fix
- Through "Release glasses": This is part of the new version
- Through "Learning glasses": This is something to study

Same work, many views!`,
        section_type: 'text',
        sort_order: 0
      }
    ]
  },
  {
    slug: 'mmot-evaluation',
    title: 'MMOT: Self-Witnessing Correction',
    title_explorer: 'The MMOT Loop',
    origin: 'academic',
    doc_type: 'concept',
    status: 'canonical',
    tags: ['mmot', 'evaluation', 'correction'],
    sections: [
      {
        title: 'The MMOT Process',
        title_explorer: 'Learning From What Happened',
        content: `MMOT (Making the Most Of Today) is Asterion's recursive evaluation protocol. When a tension stalls, redirects, or completes unexpectedly, MMOT provides structured self-witnessing.

### The Four Phases

1. **Acknowledge**: What happened? Observe without judgment.
2. **Analyze**: Why did it happen? Look for structural causes.
3. **Update Chart**: What needs to change? Revise desired outcome or current reality.
4. **Recommit or Redirect**: Move forward with updated understanding.

### When to Use MMOT

- Progress stalls for unknown reasons
- Unexpected outcomes occur
- Scope changes significantly
- Team energy drops`,
        content_explorer: `When something doesn't go as planned, MMOT helps you learn:

1. **What happened?** (Just notice, no blame)
2. **Why did it happen?** (Look for patterns)
3. **What should change?** (Update your map)
4. **What's next?** (Keep going or try something new)

It's like being a scientist studying your own work!`,
        section_type: 'text',
        sort_order: 0
      },
      {
        title: 'MMOT Loop Diagram',
        content: '',
        section_type: 'diagram',
        diagram_type: 'runtime_loop',
        diagram_code: `flowchart TD
  A[Acknowledge] -->|what happened?| B[Analyze]
  B -->|why did it happen?| C[Update Chart]
  C -->|what needs to change?| D[Recommit or Redirect]
  D -->|execute| E[Action]
  E -->|observe results| A
  
  style A fill:#3b82f6
  style B fill:#8b5cf6
  style C fill:#ec4899
  style D fill:#f59e0b`,
        sort_order: 10
      }
    ]
  },
  {
    slug: 'api-quickstart',
    title: 'API Quickstart',
    title_explorer: 'Talking to Asterion',
    origin: 'operational',
    doc_type: 'api',
    status: 'canonical',
    tags: ['api', 'quickstart', 'reference'],
    sections: [
      {
        title: 'Core Endpoints',
        title_explorer: 'The Main Commands',
        content: `### Tensions API

\`\`\`
GET    /api/tensions          # List all tensions
POST   /api/tensions          # Create a tension
GET    /api/tensions/:id      # Get tension details
PATCH  /api/tensions/:id      # Update a tension
DELETE /api/tensions/:id      # Delete a tension
\`\`\`

### Action Steps API

\`\`\`
GET    /api/tensions/:id/action-steps    # List steps
POST   /api/tensions/:id/action-steps    # Create step
PATCH  /api/tensions/:id/action-steps/:stepId  # Update step
\`\`\`

### Telescoping API

\`\`\`
POST   /api/tensions/:id/telescope    # Telescope action step to new tension
\`\`\``,
        content_explorer: `The API is how computers talk to Asterion. Here are the main things you can do:

**Tensions (the main goals):**
- GET = "Show me the tensions"
- POST = "Create a new tension"
- PATCH = "Update a tension"
- DELETE = "Remove a tension"

**Action Steps (the small tasks):**
- Same pattern! GET, POST, PATCH

**Telescoping (zooming in):**
- POST to make a small task into its own goal`,
        section_type: 'code',
        sort_order: 0
      }
    ]
  },
  {
    slug: 'prompt-decomposition-engine',
    title: 'PDE: Prompt Decomposition Engine',
    title_explorer: 'Breaking Down Big Ideas',
    origin: 'technical',
    doc_type: 'concept',
    status: 'canonical',
    tags: ['pde', 'decomposition', 'intents', 'directions'],
    sections: [
      {
        title: 'What is PDE?',
        title_explorer: 'The Idea Breaker-Upper',
        content: `The Prompt Decomposition Engine (PDE) is Asterion's structured approach to breaking down complex prompts and requests into actionable components.

### Core Structure

PDE decomposes prompts into:

1. **Primary Intent**: The main action verb, target, urgency, and confidence level
2. **Secondary Intents**: Implicit or dependent actions that support the primary
3. **Directional Mapping**: Actions categorized by cognitive direction
4. **Action Stack**: Prioritized sequence of tasks with dependencies
5. **Ambiguities**: Parts that need clarification before execution

### The Four Directions

PDE uses a directional model for categorizing work:

- **East (Vision)**: What do we want? Clarifying questions, scope definition
- **South (Analysis)**: What do we know? Research, investigation, understanding
- **West (Validation)**: Does it work? Testing, verification, review
- **North (Action)**: What to do? Implementation steps, concrete tasks

### JSON Schema

\`\`\`json
{
  "primary": {
    "action": "main action verb",
    "target": "what the action applies to",
    "urgency": "immediate|session|persistent",
    "confidence": 0.0-1.0
  },
  "secondary": [...],
  "directions": { "east": [], "south": [], "west": [], "north": [] },
  "actionStack": [...],
  "ambiguities": [...]
}
\`\`\``,
        content_explorer: `When someone asks you to do something big, like "clean your room and get ready for school," your brain automatically breaks it down:

1. **Main Thing**: Get ready for school (that's the deadline!)
2. **Other Things**: Clean room (helps with #1)
3. **Questions**: What counts as "clean"? What time is school?
4. **Order**: Probably clean room first, then get dressed

PDE does this same breaking-down for computer work!

### The Four Directions (Like a Compass!)

- **East (Sunrise)**: What do we WANT? (The dream)
- **South (Analysis)**: What do we KNOW? (The research)
- **West (Sunset)**: Does it WORK? (The testing)
- **North (Action)**: What do we DO? (The building)`,
        section_type: 'text',
        sort_order: 0
      },
      {
        title: 'PDE Example',
        title_explorer: 'See It In Action',
        content: `### Example Decomposition

**Original Prompt**: "Help me refactor the authentication module to support OAuth while maintaining backward compatibility"

**Decomposed**:
\`\`\`json
{
  "primary": {
    "action": "refactor",
    "target": "authentication module",
    "urgency": "session",
    "confidence": 0.95
  },
  "secondary": [
    {
      "action": "add",
      "target": "OAuth support",
      "dependency": "primary",
      "confidence": 0.95
    },
    {
      "action": "maintain",
      "target": "backward compatibility",
      "implicit": false,
      "confidence": 0.9
    }
  ],
  "directions": {
    "east": ["Define OAuth providers to support"],
    "south": ["Research OAuth 2.0 patterns", "Analyze current auth dependencies"],
    "west": ["Test existing auth flows still work"],
    "north": ["Implement OAuth provider abstraction"]
  }
}
\`\`\``,
        content_explorer: `Let's break down: "Help me build a treehouse that's safe and has a rope ladder"

**Main Goal**: Build a treehouse
**Also Important**: 
- Make it safe (very important!)
- Add a rope ladder (a specific feature)

**Questions to Ask (East)**:
- How big should it be?
- Which tree?

**Things to Figure Out (South)**:
- What wood is best?
- How do treehouses stay up?

**Safety Checks (West)**:
- Is it sturdy?
- Will the rope hold?

**Building Steps (North)**:
- Get materials
- Build the platform
- Add the ladder`,
        section_type: 'code',
        sort_order: 10
      }
    ]
  }
];

export async function POST() {
  try {
    for (const pageData of SEED_PAGES) {
      // Check if page already exists
      const existing = await sql`
        SELECT id FROM asterion.doc_pages WHERE slug = ${pageData.slug}
      `;
      
      if (existing.length > 0) {
        continue; // Skip if already seeded
      }

      // Create page
      const [page] = await sql`
        INSERT INTO asterion.doc_pages (
          slug, title, title_explorer, origin, doc_type, status, tags
        ) VALUES (
          ${pageData.slug},
          ${pageData.title},
          ${pageData.title_explorer || null},
          ${pageData.origin},
          ${pageData.doc_type},
          ${pageData.status},
          ${pageData.tags}::text[]
        )
        RETURNING id
      `;

      // Create sections
      for (const section of pageData.sections) {
        await sql`
          INSERT INTO asterion.doc_sections (
            page_id, title, title_explorer, content, content_explorer,
            section_type, diagram_type, diagram_code, callout_type, sort_order, status
          ) VALUES (
            ${page.id}::uuid,
            ${section.title},
            ${section.title_explorer || null},
            ${section.content},
            ${section.content_explorer || null},
            ${section.section_type},
            ${section.diagram_type || null},
            ${section.diagram_code || null},
            ${section.callout_type || null},
            ${section.sort_order},
            'canonical'
          )
        `;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${SEED_PAGES.length} documentation pages` 
    });
  } catch (error) {
    console.error('Failed to seed documentation:', error);
    return NextResponse.json(
      { error: 'Failed to seed documentation' },
      { status: 500 }
    );
  }
}

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS, and JavaScript. The current repository confirms this stack.

## Users

- Mission commander: reviews reports, verifies or rejects them, activates alerts, and follows the operation.
- Drone operator: simulates a flight and reports observations from the air.
- Ground unit: receives active hazards and a clear recommendation for its response.
- Hackathon jury and presenters: need to understand and demonstrate the end-to-end workflow quickly.

These roles describe the intended demonstration. No field research with emergency responders has been provided.

## Product Purpose

SkyFreedom is a local hackathon demonstrator of how a drone observation can become useful information for a ground team. Success means a first-time viewer can understand the situation and follow the report, human verification, and response workflow.

## Positioning

The demonstrated mechanism is a shared operational view in which a drone operator submits an observation, a commander verifies it, and only then does an actionable alert reach a ground unit.

## Operating Context

- The interface is demonstrated locally during a short hackathon presentation.
- The first screen asks the person using the demo to choose a role; this is a simulation, not authentication.
- The operation and map are illustrative. The product is not connected to public safety or aviation systems.
- The interface must remain understandable under time pressure and across desktop, tablet, and phone sizes.

## Capabilities and Constraints

- Keep the current demonstration flow: role choice; drone flight and changing telemetry; incident report; commander verification, rejection, and activation; ground alert; incident clearance; airspace restriction and restoration; timeline; reset.
- Data and state stay local in the browser. Do not add a backend, external operational API, account system, or real drone control.
- Keep the fictional satellite map, drone imagery, incident data, and telemetry local. Do not request external map tiles or send coordinates elsewhere. The 3D terrain view has been removed at the user's request.
- The commander sees three simulated drone images and readings for the selected drone. The operator sees a larger simulated camera view with flight, zoom, and visual mode controls. These are illustrative images and readings, not live feeds or validated sensors.
- Keep the static HTML/CSS/JavaScript stack.
- Use Polish interface copy and accessible state names. Important state must not rely on color alone.
- The existing airspace disclaimer remains visible: the demonstration does not replace applicable procedures, permissions, or operator responsibility.
- Suggested role-based layouts, information architecture, and personas are product hypotheses until tested with intended users.

## Brand Commitments

- Application name: SkyFreedom.
- The user requested a technical, very simple, high-contrast interface that is adaptable to computer, tablet, and phone and usable under time pressure.
- Use direct, plain Polish for operational instructions and actions.

## Evidence on Hand

- User-supplied Dual Use Hackathon challenge description, rules, public-data list, presentation, and project concept.
- A working local static prototype in `index.html`, `style.css`, and `app.js`; its visual system is explicitly being replaced, while the demonstration behaviors remain in scope.
- No verified field data, real incident imagery, live telemetry, or user-test results.

## Product Principles

1. Put the current situation and next action where the user looks first.
2. Keep human verification between observation and operational alert.
3. Make each role's responsibilities obvious without implying separate accounts.
4. Label simulated information honestly.
5. Preserve legibility and usable controls across touch, keyboard, and screen sizes.

## Accessibility & Inclusion

- Primary touch actions should be at least 44 × 44 CSS pixels.
- Keyboard users need a visible focus state and a logical focus order.
- Pair status color with words or an icon plus a label.
- Respect `prefers-reduced-motion`.
- Avoid horizontal overflow at 375, 768, 1024, and 1440 CSS pixels.

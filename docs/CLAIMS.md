# Claims register

Every statement the site makes about the product, with its status. The site's own vocabulary is: **Design concept**, **Design target**, **Design requirement**, **Design goal**, **Planned**, **Subject to validation**. Nothing on the site is labelled "available", "tested" or "confirmed", because nothing has been validated on a physical unit.

## Source of facts

Specification-type figures come from the V5 design baseline in the project material. They are **unverified by this website project**: the website team did not measure a physical unit and had no CAD to cross-check. The renders are concept renders.

## Registered claims

| Where | Statement | Status shown on site | Evidence needed before it can be stated as fact |
| --- | --- | --- | --- |
| Hero, product | Compact, wheeled home robot with an expressive display, powered by NAVIQ OS | Concept | Owner confirmation of positioning |
| Specs | Overall height about 302 mm | Design target | Measured or CAD-verified |
| Specs | Chassis envelope about 180 x 140 mm | Design target | Measured or CAD-verified |
| Specs | Ground clearance about 12 mm | Design target | Measured on a unit |
| Specs | Display opening about 100 x 55 mm | Design target | CAD-verified |
| Specs | Differential drive with two driven wheels and a rear support point | Design concept | Prototype |
| Specs | Five ultrasonic positions (front-left, front-right, left, right, rear) | Design requirement | Hardware list, and test results before any performance claim |
| Specs | Removable shell panels, battery hatch, electronics tray | Design goal | Mechanical validation |
| Explore | Head pan clearance about +/-45 degrees | Design target | Mechanical validation |
| NAVIQ OS | Four-layer architecture; autonomy proposes, safety and control permits | Planned / design principle | Software architecture review and implementation |
| Trust | Explicit permissions, minimisation, defined local and cloud boundaries, predictable controls and safe stopping, permission boundary | Design commitments (stated as commitments, "we will say when each one is implemented and verified") | Implementation and test evidence per item |
| Features and use cases | Selected information, reminders, status face, selected connected workflows, learning and demonstration | Design direction / Planned / Subject to validation | Product definition and user testing |
| Approach | Staged path from visual concept to production-ready feature; "we are here" at stage 1 | Process statement | Owner confirmation that the project is at the design-concept stage |

## Deliberately not stated

Price, release date, availability, battery life, charging, speed, weight, payload, manipulation capability, microphones, cameras, connectivity, compute platform, supported smart-home brands or standards, certifications, safety ratings, partnerships, testimonials, press, user numbers, awards. The specs section lists these as **Not yet specified**.

## Deliberately not depicted

* No household tasks, no caregiving, no children, older adults or pets with the robot. The site says explicitly what ZunoBot is **not** positioned as.
* `zunobot.mp4` from the project folder is **not used** because it shows care and supervision scenes.

## Words that are policed

`scripts/claims-lint.ts` fails the build checks on "certified", "fail-proof", "fully autonomous", "100% safe", "guaranteed safety/privacy", unsupported superlatives, "military-grade" and clinical claims unless the sentence is a negation or states a precondition. It also blocks placeholder text.

## Needs owner confirmation

1. That "design concept" is the correct maturity label and that "waitlist and discovery" is the current stage.
2. That the V5 figures above are still current.
3. The legal entity operating the waitlist and the official contact address (the privacy page and footer are blank on purpose).
4. Whether "Powered by NAVIQ OS" is acceptable wording given NAVIQ OS is described as planned.

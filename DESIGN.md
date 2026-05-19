---
name: ScholarAid
description: AI-Powered Scholarship Assistance for Filipino Students
colors:
  primary: "#10b981" # oklch(0.517 0.153 163)
  secondary: "#14b8a6" # oklch(0.6 0.118 184.704)
  neutral-bg: "#fafaf8" # oklch(0.985 0.004 95)
  neutral-fg: "#1a1c1e" # oklch(0.145 0.005 260)
  dark-bg: "#080f1a" # Custom Hero background
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 7vw, 5rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card-glass:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: ScholarAid

## 1. Overview

**Creative North Star: "The Iskolars' Compass"**

ScholarAid is designed to be a stabilizing force for students navigating the high-stakes transition to university. The system follows a **Dual-State Narrative**: it acknowledges the "Darkness of Uncertainty" in the initial research phase (deep navy hero, glassmorphism, ethereal glows) and moves students toward the "Clarity of Light" (clean white surfaces, emerald accents, high-contrast utility) as they engage with matching and reviewer tools.

**Key Characteristics:**
- **Hopeful Momentum**: Subtle animations and progress indicators that celebrate small wins.
- **Resilient Utility**: A focus on mobile-first clarity and performance, ensuring tools work on any device.
- **Supportive Precision**: AI tools are presented with technical confidence but guiding warmth.

## 2. Colors

The palette is anchored by "Bicolano Sea Emerald"—a hue that feels both high-tech and organically Filipino.

### Primary
- **Bicolano Sea Emerald** (oklch(0.517 0.153 163)): The main action color. Used for primary buttons, success states, and progress indicators.
- **Deep Tidal Teal** (oklch(0.6 0.118 184.704)): Used for secondary accents and gradients to add depth.

### Neutral
- **Isla Parchment** (oklch(0.985 0.004 95)): The light-mode background. Warm, non-clinical, and easy on the eyes.
- **Nocturnal Blue** (#080f1a): The hero-state background. Provides a high-contrast stage for AI glows.

### Named Rules
**The 10% Emerald Rule.** Emerald is a reward for the eye. It must never exceed 10% of any tool-heavy screen to ensure it maintains its "guiding" value.

## 3. Typography

**Display Font:** Plus Jakarta Sans
**Body Font:** Inter
**Mono Font:** Geist Mono

**Character: Technical Precision & Supportive Clarity.** The system transitions from a fluid hero display to a disciplined, fixed-scale product interface. Plus Jakarta Sans provides geometric authority, while Inter ensures maximum legibility for dense scholarship criteria and AI-generated content.

### Type Scale (1.2 Minor Third)
The system uses a modular scale to ensure mathematical harmony and clear hierarchy.

| Role | Weight | Size (rem) | Size (px) | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 800 | 2.488rem | ~40px | Hero Headlines |
| **H2** | 700 | 2.074rem | ~33px | Section Titles |
| **H3** | 700 | 1.728rem | ~28px | Card Titles / Tool Headings |
| **H4** | 700 | 1.44rem | ~23px | Minor Subheadings |
| **H5** | 600 | 1.2rem | ~19px | Labels / Prompts |
| **Body** | 400 | 1rem | 16px | Primary Prose (Inter) |
| **Small** | 400 | 0.833rem | ~13px | Captions / Metadata |

**Named Rules:**
- **The 65ch Rule.** All long-form text containers (scholarship descriptions, AI reviews) are capped at a maximum width of 65 characters to maintain reading stamina.
- **Tightened Tracking.** Display and H1-H3 headings use `letter-spacing: -0.02em` to feel cohesive and professional.
- **Standard Line-Height.** Body text is set to `1.6` to ensure accessibility and breathing room.

## 4. Elevation

ScholarAid avoids artificial shadows at rest, favoring tonal layering and glassmorphism in dark contexts.

### Named Rules
**The Response Elevation Rule.** Surfaces are flat by default. Depth is only introduced as a response to interaction (hover/active) or to distinguish AI-generated content (Glassmorphism).

## 5. Components

### Buttons
- **Shape:** Softened Rectangles (10px radius)
- **Primary:** Emerald gradient background, white text.
- **Hover:** Slight scale-up (1.05x) and intensified shadow-glow.

### Cards: The Scholar-Card
- **Style:** Light mode: White with 1px border (oklch(0.918 0.008 155)). Dark mode: Glassmorphism (blur-16, 6% opacity).
- **Internal Padding:** Generous (24px) to avoid a "cluttered ad-portal" feel.

## 6. Do's and Don'ts

### Do:
- **Do** use OKLCH for all brand-new color declarations.
- **Do** prioritize mobile-first layout stacking for all scholarship tables.
- **Do** use the "Resilient Navigation" pattern: keep the primary action fixed or easily accessible.

### Don't:
- **Don't** use side-stripe borders as colored accents on cards.
- **Don't** use generic blue or clinical teals; stick to the Bicolano Sea Emerald.
- **Don't** use "SaaS-cream" gradients that feel impersonal; favor the Dual-State Narrative.

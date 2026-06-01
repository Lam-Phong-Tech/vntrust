# Mobile Design System Document

## 1. Creative North Star: "The Digital Sentinel"
This design system is engineered to feel like a high-end, proprietary security interface. It moves away from the "friendly SaaS" aesthetic toward a **Cyber-Editorial** experience. The visual language is defined by atmospheric depth, where information isn't just displayed—it is "illuminated" within a dark, secure vacuum. 

By leveraging intentional asymmetry, high-contrast typography scales, and overlapping translucent layers, we create a mobile experience that feels more like a precision instrument than a generic app. 

---

## 2. Color & Atmospheric Texture
The palette is a sophisticated interplay of deep void-space and electric data-accents.

### The Palette (Material Design Tokens)
*   **Background:** `#041424` (The Primary Canvas)
*   **Surface Containers:** Range from `#0c1d2d` (Low) to `#263647` (Highest)
*   **Primary/Action:** `#53e2f7` (Cyan/Teal)
*   **Tertiary/Highlight:** `#ffc84b` (Gold/Yellow for High-Value Security)
*   **Functional Errors:** `#ffb4ab` (Soft Red)

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid hex-colored borders to define sections. Layouts must be carved out using color shifts. 
*   Use `surface_container_low` for the base sectioning.
*   Use `surface_container_high` for nested interactive components.
*   Separation is achieved via tonal contrast, not structural outlines.

### Signature Textures
To ensure a premium feel, avoid flat color fills for primary CTAs. Instead, apply a linear gradient from `primary` (#53e2f7) to `primary_container` (#26c6da) at a 135-degree angle. This mimics the subtle glow of a high-resolution screen.

---

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance technological precision with human readability.

*   **Display & Headlines (Space Grotesk):** This is our "Precision" font. It should be used with tight letter-spacing (-2%) for large headers to convey a tech-forward, authoritative voice.
*   **Body & Labels (Manrope):** Our "Functional" font. It provides high legibility on mobile screens.

**Hierarchy Strategy:**
*   **Display-LG (3.5rem):** Reserved for hero data points (e.g., trust scores or large currency values).
*   **Headline-SM (1.5rem):** Used for section titles, often paired with a `tertiary` (Gold) highlight or a `primary` (Cyan) underline.
*   **Label-MD (0.75rem):** Always uppercase with increased letter-spacing (5-10%) when used for metadata or category tags to create an "architectural" feel.

---

## 4. Elevation & Depth: Tonal Layering
In this design system, height is not measured by shadows alone, but by **opacity and blur**.

### The Layering Principle
Treat the mobile screen as a 3D space.
1.  **Level 0 (Base):** `surface` color.
2.  **Level 1 (Sections):** `surface_container_low`.
3.  **Level 2 (Cards):** Glassmorphism. Use `surface_variant` at 40% opacity with a 20px Backdrop Blur. 

### Ambient Shadows
Avoid heavy black shadows. If a floating element (like a Bottom Sheet) requires a shadow, use a tinted version of `surface_container_highest` at 15% opacity with a blur radius of 30px. This simulates light reflecting off the deep blue interface.

### The "Ghost Border"
When an element requires more definition (e.g., a card in a busy list), use a 1px border using `outline_variant` at **20% opacity**. This creates a "hairline" effect that suggests a glowing edge rather than a hard physical boundary.

---

## 5. Signature Components

### Buttons
*   **Primary:** Gradient fill (Cyan/Teal). No border. White text (on_primary). Large corner radius (`xl`: 1.5rem).
*   **Secondary/Glass:** `surface_bright` at 10% opacity, Backdrop Blur 15px, with a "Ghost Border."
*   **Tertiary:** Text-only in `primary` color, uppercase `label-md` styling.

### Cards (Glassmorphism)
All cards must use the Glassmorphism rule. Forbid the use of divider lines within cards. Separate content using `body-sm` metadata vs `title-md` headers, or use a 16px vertical gap. 

### Circular Gauges & Charts
*   **Gauges:** Use `primary` for the active track and `surface_container_highest` for the inactive track. 
*   **Line Charts:** Use a 2px stroke width for lines. Add a subtle vertical gradient fill below the line (from `primary` at 20% opacity to `transparent`) to create volume.

### Input Fields
*   **Inactive:** `surface_container_highest` background, no border.
*   **Focused:** Add a 1px "Ghost Border" using the `primary` color and a subtle outer glow (4px blur, 10% opacity `primary`).

---

## 6. Do’s and Don’ts

### Do
*   **Do** use intentional asymmetry. Align titles to the left but place supporting "Scan" actions in floating, offset glass cards.
*   **Do** use `tertiary` (Gold) sparingly. It is a "reward" color, reserved for verified status, gold-tier assets, or critical alerts.
*   **Do** maximize "Breathing Room." Mobile screens should feel expansive, not cramped. Use the `lg` (1rem) spacing token as your minimum gutter.

### Don’t
*   **Don't** use pure black (#000000). It kills the "Deep Blue" atmospheric depth.
*   **Don't** use standard Material dividers. If you feel you need a line, use a background color shift instead.
*   **Don't** use high-opacity shadows. They look "dirty" against the dark theme. Keep shadows ethereal and tinted.
*   **Don't** use 100% opaque borders. They break the illusion of the "glass" interface.
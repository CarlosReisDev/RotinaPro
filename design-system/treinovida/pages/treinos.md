# Treinos Page Overrides

> **PROJECT:** TreinoVida
> **Generated:** 2026-04-22 16:46:25
> **Page Type:** Search Results

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero (Topic + Timer + Form), 2. What you'll learn, 3. Speaker Bio, 4. Urgency/Bonuses, 5. Form (again)

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Urgency: Red/Orange. Professional: Blue/Navy. Form: High contrast white.

### Component Overrides

- Avoid: Default keyboard for all inputs
- Avoid: Desktop-first causing mobile issues
- Avoid: Enable by default everywhere

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Expo.out Bezier(0.16,1,0.3,1) easing; spring modals (damping:20 stiffness:90); haptic-linked press (Impact Light/Medium); animated ambient light blobs (Reanimated translateX/Y slow oscillation); BlurView glassmorphism headers/nav (intensity 20); scale press 0.97 → 1.0; avoid pure #000000 (OLED smear)
- Forms: Use inputmode attribute
- Responsive: Start with mobile styles then add breakpoints
- Touch: Disable where not needed
- CTA Placement: Hero (Right side form) + Bottom anchor

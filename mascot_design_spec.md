# 🦁 Official Mascot Design Specification — Baby Lion for IMRANE (عمران)

This document establishes the official reference design and visual guidelines for the recurring 3D baby lion mascot created for **IMRANE (عمران)**'s preschool educational application.

---

## 🎨 Visual Reference

![Official 3D Baby Lion Mascot - Transparent PNG](/home/develop/.gemini/antigravity-ide/brain/887f68aa-8b23-4431-9ee2-30be293aff4c/imrane_baby_lion_mascot.png)

---

## 📋 Character Identity & Profile

| Characteristic | Specification |
| :--- | :--- |
| **Character Type** | Adorable 3D Baby Lion Cub (Toddler proportion) |
| **Target Audience** | 4-year-old child (IMRANE / عمران) |
| **Personality** | Warm, encouraging, curious, joyful, gentle, and protective |
| **Aesthetic Style** | High-end 3D animated feature film (Pixar / Disney style) |
| **Head & Face** | Large rounded head, soft chubby cheeks, gentle friendly smile |
| **Eyes** | Big, expressive hazel-brown eyes with bright highlights and warm wonder |
| **Ears & Nose** | Rounded baby ears with cream inner fur, tiny dark button nose |
| **Fur & Mane** | Velvety golden-orange coat with a fluffy, soft honey-brown mane |
| **Body Proportions** | Cuddly small body, soft cream tummy, short legs, rounded padded paws (no claws, no sharp teeth) |
| **Signature Accessory** | Cozy knitted turquoise scarf (`#2EC4B6`) with a miniature golden star pendant (`#F4B942`) |

---

## 🎨 Color Palette & Design Tokens

Use these exact color values in your UI and CSS styling to maintain visual harmony with the mascot:

| Role | Color Name | Hex Code | Visual Sample |
| :--- | :--- | :--- | :--- |
| **Primary Fur** | Golden Honey | `#FFAF40` | `rgb(255, 175, 64)` |
| **Mane Fur** | Warm Honey Brown | `#D48439` | `rgb(212, 132, 57)` |
| **Muzzle & Belly** | Soft Cream | `#FFF2DC` | `rgb(255, 242, 220)` |
| **Eye Color** | Hazel Amber | `#5F3918` | `rgb(95, 57, 24)` |
| **Nose & Mouth** | Cocoa Brown | `#4B2B20` | `rgb(75, 43, 32)` |
| **Signature Scarf**| Playful Turquoise | `#2CB1C2` | `rgb(44, 177, 194)` |
| **Star Pendant** | Bright Star Gold | `#FFCA3A` | `rgb(255, 202, 58)` |

---

## 📁 Generated Production Assets

The mascot has been isolated with alpha transparency and formatted into multiple resolutions ready for React web app integration:

- **Full Resolution (1024 × 1024, RGBA):**  
  [`imrane_baby_lion_mascot.png`](file:///home/develop/GitHub/jeux-educatif-imrane/assets/mascot/imrane_baby_lion_mascot.png)
- **Medium Resolution (512 × 512, RGBA):**  
  [`imrane_baby_lion_mascot_512.png`](file:///home/develop/GitHub/jeux-educatif-imrane/assets/mascot/imrane_baby_lion_mascot_512.png)
- **Thumbnail / Avatar Resolution (256 × 256, RGBA):**  
  [`imrane_baby_lion_mascot_256.png`](file:///home/develop/GitHub/jeux-educatif-imrane/assets/mascot/imrane_baby_lion_mascot_256.png)

---

## 💻 React Usage Snippet

```jsx
import React from 'react';
import mascotImg from '../assets/mascot/imrane_baby_lion_mascot_512.png';

export const MascotGuide = ({ speechText }) => {
  return (
    <aside className="mascot-container" aria-label="Compagnon d'apprentissage Imrane">
      <div className="mascot-bubble">
        <p>{speechText || 'Bravo Imrane ! Continue comme ça !'}</p>
      </div>
      <img
        src={mascotImg}
        alt="Lionceau mascotte pour Imrane"
        className="mascot-avatar"
        width={160}
        height={160}
        loading="eager"
      />
    </aside>
  );
};
```

---

> [!TIP]
> **Preservation Rule:** Every subsequent scene, activity badge, or celebratory animation should reference this sheet to guarantee that the fur color, mane shape, eye expression, and turquoise scarf with the golden star remain 100% consistent throughout the application.

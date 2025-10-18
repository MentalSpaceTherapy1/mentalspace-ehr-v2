# Logo Placement Instructions

## How to Add Your Logo

1. **Save your logo image** as `logo.png` in this directory (`packages/frontend/public/`)

2. **File requirements:**
   - Filename: `logo.png` (exactly this name)
   - Format: PNG (with transparent background recommended)
   - Recommended size: 400x150 pixels or similar aspect ratio
   - The logo should be the one you shared (MentalSpace with blue "Mental" and green "Space" text)

3. **Where the logo will appear:**
   - ✅ Login page (top center, large)
   - ✅ Sidebar navigation (top of sidebar)
   - ✅ Browser tab icon (favicon)
   - ✅ All authenticated pages

4. **After adding the logo:**
   - The frontend needs to be rebuilt
   - The updated build needs to be deployed to S3
   - Clear your browser cache to see the changes

## Current Status

The code has been updated to display your logo in all the right places. Once you place the `logo.png` file in this directory, it will automatically appear throughout the application!

## Fallback

If the logo file is not found, the application will gracefully fall back to displaying "MentalSpace" text instead.

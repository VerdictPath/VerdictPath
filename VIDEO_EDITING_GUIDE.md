# Video Editing Guide for Responsive Background Videos

## Current Breakpoints
- **Mobile**: ≤ 425px width
- **Tablet**: 425px - 768px width  
- **Desktop**: ≥ 768px width

## Videos Needed

You need **3 videos** total for the login page:

### 1. Mobile Video (`cat_mobile.mp4`)
- **Target Screen Size**: ≤ 425px width
- **Recommended Aspect Ratio**: **9:16 (Portrait)** or **16:9 (Landscape)**
- **Common Mobile Resolutions**:
  - iPhone SE: 375×667 (9:16 portrait)
  - iPhone 12/13: 390×844 (9:19.5 portrait)
  - Small Android: 360×640 (9:16 portrait)
- **Editing Tips**:
  - Keep the **cat/boat centered** in the frame
  - Use **safe area** - important content should be in the center 60% of the frame
  - Avoid important content near edges (top/bottom 20% and left/right 20%)
  - Recommended resolution: **720×1280** (9:16) or **1280×720** (16:9)

### 2. Tablet Video (`cat_tab.mp4`)
- **Target Screen Size**: 425px - 768px width
- **Recommended Aspect Ratio**: **4:3** or **16:10**
- **Common Tablet Resolutions**:
  - iPad Mini: 768×1024 (4:3 portrait)
  - iPad: 768×1024 (4:3 portrait)
  - Android Tablet: 800×1280 (5:8 portrait)
- **Editing Tips**:
  - Keep the **cat/boat centered** in the frame
  - Use **safe area** - important content in center 70% of frame
  - Recommended resolution: **1024×768** (4:3) or **1280×800** (16:10)

### 3. Desktop Video (Default - `Cat looking around 10sec_1763360910310.mp4`)
- **Target Screen Size**: ≥ 768px width
- **Recommended Aspect Ratio**: **16:9** (Standard widescreen)
- **Common Desktop Resolutions**:
  - Laptop: 1366×768 (16:9)
  - Desktop: 1920×1080 (16:9)
  - Large Desktop: 2560×1440 (16:9)
- **Editing Tips**:
  - Standard widescreen format
  - Keep important content centered
  - Recommended resolution: **1920×1080** (16:9) or **1280×720** (16:9)

## Key Editing Principles

### 1. **Center the Subject**
- The cat/boat should be **centered horizontally and vertically**
- This ensures it's visible even if the video gets slightly cropped

### 2. **Use Safe Areas**
- Keep important content in the **center 60-70%** of the frame
- Avoid placing the subject near edges (top/bottom 20%, left/right 20%)

### 3. **Aspect Ratio Matching**
- **Mobile**: Use portrait or square aspect ratio (9:16 or 1:1)
- **Tablet**: Use 4:3 or 16:10 aspect ratio
- **Desktop**: Use 16:9 widescreen

### 4. **Resolution Guidelines**
- **Mobile**: 720×1280 (9:16) or 1080×1920 (9:16)
- **Tablet**: 1024×768 (4:3) or 1280×800 (16:10)
- **Desktop**: 1920×1080 (16:9) or 1280×720 (16:9)

## Video Editing Software Recommendations

1. **Adobe Premiere Pro**
2. **Final Cut Pro** (Mac)
3. **DaVinci Resolve** (Free)
4. **iMovie** (Mac - Simple)
5. **Shotcut** (Free, Cross-platform)

## Editing Steps

1. **Import your original video**
2. **Create a new sequence** with the target aspect ratio:
   - Mobile: 9:16 (1080×1920 or 720×1280)
   - Tablet: 4:3 (1024×768)
   - Desktop: 16:9 (1920×1080)
3. **Center the subject** (cat/boat) in the frame
4. **Scale/Position** the video so the subject is in the center safe area
5. **Export** with these settings:
   - Format: MP4 (H.264)
   - Resolution: Match your sequence
   - Frame rate: 30fps (or match original)
   - Bitrate: 5-10 Mbps (for web)

## Testing Checklist

After editing, test each video:
- [ ] Cat/boat is centered in the frame
- [ ] No important content is cut off on edges
- [ ] Video plays smoothly
- [ ] File size is reasonable (< 20MB per video)
- [ ] Works on actual devices (not just browser resize)

## Current File Status

✅ **cat_mobile.mp4** - Exists (needs verification)
✅ **cat_tab.mp4** - Exists (needs verification)
✅ **Cat looking around 10sec_1763360910310.mp4** - Default desktop video

## Troubleshooting

If videos still crop:
1. Check the video's actual aspect ratio matches the target
2. Ensure the subject is truly centered
3. Verify the video file isn't corrupted
4. Check browser console for loading errors
5. Test on actual devices, not just browser resize


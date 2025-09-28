# 🎯 TeksiMap Logo PNG Generator

This directory contains tools to convert your TeksiMap SVG logos to PNG format for PowerPoint compatibility.

## 📁 Files Included

- `logo-converter.html` - Web-based converter (open in browser)
- `generate-png-logos.js` - Node.js script for batch generation
- `LOGO_PNG_README.md` - This instruction file

## 🚀 Quick Start (Web Browser Method)

1. **Open the converter**: Double-click `logo-converter.html` or open it in your web browser
2. **Download logos**: Click the download buttons for the sizes you need
3. **Use in PowerPoint**: Insert the downloaded PNG files into your presentations

## 🛠️ Advanced Method (Node.js Script)

### Prerequisites
```bash
npm install sharp
```

### Run the generator
```bash
node generate-png-logos.js
```

This will create a `logos-png` folder with all logo variations.

## 📊 Available Logo Variations

### 🎨 Logo Types
- **Logo Advanced** - For light backgrounds (blue "Map" text)
- **Logo White** - For dark backgrounds (white "Map" text)  
- **Icon** - Circular logo with T and map pin

### 📏 Available Sizes

#### Text Logos (Advanced & White)
- **240x60** - Small headers, footers
- **480x120** - Standard PowerPoint headers
- **960x240** - High-resolution presentations
- **1920x480** - Ultra-high resolution

#### Icon
- **200x200** - Small profile pictures
- **400x400** - Standard icons
- **800x800** - High-resolution icons
- **1600x1600** - Ultra-high resolution

## 🎨 Color Palette

- **Primary Blue**: #01386A (Dark Blue)
- **Secondary Blue**: #0056b3 (Medium Blue)
- **Gold**: #FFD700 (Primary Gold)
- **Orange**: #FFA500 (Orange Accent)
- **White**: #FFFFFF (For dark backgrounds)

## 📋 PowerPoint Usage Tips

### ✅ Best Practices
1. **Choose the right version**:
   - Use "Advanced" logos for light backgrounds
   - Use "White" logos for dark backgrounds
   - Use "Icon" for profile pictures or small spaces

2. **Select appropriate size**:
   - Headers: 480x120 or 960x240
   - Footers: 240x60
   - Profile pictures: 400x400
   - High-res presentations: 960x240 or 1920x480

3. **Maintain aspect ratio**: Always resize proportionally to avoid distortion

### 🚫 Common Mistakes to Avoid
- Don't stretch logos horizontally or vertically
- Don't use white logos on light backgrounds
- Don't use advanced logos on dark backgrounds
- Don't use very small sizes for print materials

## 🔧 Troubleshooting

### Web Converter Issues
- **Download not working**: Try a different browser (Chrome, Firefox, Edge)
- **Logos not displaying**: Check if JavaScript is enabled
- **Poor quality**: Use higher resolution versions

### Node.js Script Issues
- **Sharp not found**: Run `npm install sharp`
- **Permission errors**: Run with administrator privileges
- **Memory issues**: Close other applications and try again

## 📞 Support

If you encounter any issues:
1. Check that all files are in the same directory
2. Ensure you have the latest version of your browser
3. For Node.js issues, ensure you have Node.js installed

## 🎯 Quick Reference

| Use Case | Logo Type | Size | File Name |
|----------|-----------|------|-----------|
| PowerPoint Header | Advanced | 480x120 | teksimap-logo-advanced-480x120.png |
| Dark Background | White | 480x120 | teksimap-logo-white-480x120.png |
| Profile Picture | Icon | 400x400 | teksimap-icon-400x400.png |
| High-Res Print | Advanced | 1920x480 | teksimap-logo-advanced-1920x480.png |
| Small Footer | Advanced | 240x60 | teksimap-logo-advanced-240x60.png |

---

**Happy presenting! 🎉**


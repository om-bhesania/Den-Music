# YouTube API Setup Guide

## 🎵 YouTube Data API v3 Integration

This bot now uses the official [YouTube Data API v3](https://developers.google.com/youtube/v3) for more reliable search results and video information.

## 📋 Setup Instructions

### 1. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

### 2. Configure Environment Variables

Add your YouTube API key to your `.env` file:

```env
# Discord Bot Tokens (comma-separated)
BOT_TOKENS=YOUR_BOT_TOKEN_HERE

# Server Configuration
PORT=3001
NODE_ENV=development

# YouTube API Configuration
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE

# Optional: Additional configuration
DEBUG=false
```

### 3. API Quota Information

- **Free Tier**: 10,000 units per day
- **Search Request**: 100 units
- **Video Details Request**: 1 unit
- **Estimated Usage**: ~100-200 units per day for normal bot usage

## 🚀 Benefits of YouTube API

### ✅ **Advantages:**
- **Official API**: No scraping issues or signature extraction problems
- **Reliable**: Official Google service with 99.9% uptime
- **Accurate**: Real-time data from YouTube
- **Rich Data**: Detailed video information, statistics, and metadata
- **Music Category**: Automatically filters for music videos
- **No Rate Limits**: Generous quota for bot usage

### 🔄 **Fallback System:**
- **Primary**: YouTube Data API v3 (when API key is provided)
- **Fallback**: Play-DL search (when no API key is configured)
- **Streaming**: Always uses Play-DL for reliable audio streaming

## 🎯 Features

### **Search Capabilities:**
- Music-specific search (category filtering)
- Relevance-based results
- Duration information
- View counts and statistics
- High-quality thumbnails

### **URL Support:**
- YouTube URLs: `https://www.youtube.com/watch?v=...`
- YouTube Music URLs: `https://music.youtube.com/watch?v=...`
- YouTube Short URLs: `https://youtu.be/...`
- Search queries: Song names, artist names, etc.

### **Enhanced Information:**
- Accurate video duration
- Channel information
- View counts and like counts
- Live stream detection
- High-quality thumbnails

## 🔧 Configuration

### **Environment Variables:**
```env
YOUTUBE_API_KEY=your_api_key_here
```

### **Optional Settings:**
- `DEBUG=false` - Enable/disable detailed logging
- `NODE_ENV=development` - Environment mode

## 📊 Usage Examples

### **Search Queries:**
- `/play despacito`
- `/play ed sheeran shape of you`
- `/play despacito luis fonsi`

### **Direct URLs:**
- `/play https://www.youtube.com/watch?v=...`
- `/play https://music.youtube.com/watch?v=...`

## 🛠️ Troubleshooting

### **Common Issues:**

1. **"YouTube API key not configured"**
   - Add `YOUTUBE_API_KEY` to your `.env` file
   - Bot will fallback to Play-DL search

2. **"Quota exceeded"**
   - Check your Google Cloud Console quota usage
   - Consider upgrading to paid tier if needed

3. **"API key invalid"**
   - Verify your API key is correct
   - Ensure YouTube Data API v3 is enabled

### **Fallback Behavior:**
- If API key is missing: Uses Play-DL search
- If API fails: Falls back to Play-DL
- If streaming fails: Shows error message

## 🎵 Ready to Use!

Once you've added your YouTube API key to the `.env` file, restart the bot:

```bash
npm start
```

The bot will now use the official YouTube Data API for reliable, accurate search results! 🚀 
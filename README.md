# SafeSurf

AI-powered safe browsing extension with parental controls.

## Setup

1. Clone the repository
2. Create a `.env` file with your Firebase and Safe Browsing API credentials
3. Run `npm install`
4. Run `npm run build:extension`
5. Load the extension in Chrome from the `build` directory

## Development

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run build:extension` - Build Chrome extension
- `npm test` - Run tests

## License

MIT

## Project Overview
SafeSurf is a browser extension providing AI-powered content filtering and parental controls.

### Core Features
- Real-time URL safety checking
- Content filtering (text and images)
- Time restrictions
- Category-based blocking
- Parent dashboard
- Activity logging

## Project Structure
```
safesurf/
├── manifest.json                 # Extension configuration
├── src/
│   ├── background/
│   │   └── background.js        # Background service worker
│   ├── components/
│   │   └── ParentDashboard.jsx  # React dashboard component
│   ├── config/
│   │   └── firebase.js          # Firebase configuration
│   ├── content/
│   │   ├── content.js           # Content script for page analysis
│   │   └── content.css          # Styles for content filtering
│   ├── popup/
│   │   ├── popup.html          # Extension popup interface
│   │   ├── popup.css           # Popup styles
│   │   └── popup.js            # Popup functionality
│   └── utils/
│       └── firebaseUtils.js     # Firebase helper functions
└── public/
    └── icons/                   # Extension icons and images
```

## Setup & Deployment Steps

1. **Initial Setup**
   ```bash
   npm install
   ```

2. **Firebase Configuration**
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Copy configuration to src/config/firebase.js

3. **Build Extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome Extensions (chrome://extensions/)
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the `dist` folder

5. **Parent Dashboard Setup**
   - Create parent account
   - Set initial restrictions
   - Configure time limits

## Data Flow

1. **URL Protection**
   - Background script checks URLs
   - Uses Google Safe Browsing API
   - Blocks malicious sites

2. **Content Filtering**
   - Content script analyzes page
   - Uses TensorFlow.js for image scanning
   - Applies filtering based on settings

3. **Settings Management**
   - Stored in Firebase
   - Synced across devices
   - Real-time updates

4. **Activity Logging**
   - Records blocked attempts
   - Stores browsing statistics
   - Available in parent dashboard

## File Purposes

- **manifest.json**: Extension configuration and permissions
- **background.js**: URL checking and main logic
- **content.js**: Page analysis and filtering
- **ParentDashboard.jsx**: Settings and monitoring interface
- **firebase.js**: Database and auth configuration
- **firebaseUtils.js**: Database operation helpers

## Development Notes

1. **Required APIs**
   - Google Safe Browsing
   - Firebase Authentication
   - Firestore Database

2. **Testing**
   ```bash
   npm run test
   ```

3. **Debugging**
   - Check background page console
   - Monitor content script logs
   - Watch Firebase logs

## Common Issues & Solutions

1. **Content Not Filtering**
   - Check content script permissions
   - Verify Firebase connection
   - Confirm settings synchronization

2. **Dashboard Not Loading**
   - Verify Firebase credentials
   - Check authentication state
   - Confirm database rules

3. **Extension Not Updating**
   - Clear extension cache
   - Reload extension
   - Check service worker

## Deployment Checklist

- [ ] Firebase project created
- [ ] API keys configured
- [ ] Build successful
- [ ] Extension loaded in Chrome
- [ ] Parent account created
- [ ] Initial settings configured
- [ ] Test all features
- [ ] Verify logging
- [ ] Check performance
- [ ] Review security

## Security Considerations

1. **Data Storage**
   - Sensitive data in Firestore
   - Local storage for temporary data
   - Encrypted communication

2. **Authentication**
   - Secure parent access
   - Session management
   - Password requirements

3. **API Security**
   - API key protection
   - Request rate limiting
   - Error handling

## Support & Maintenance

1. **Regular Updates**
   - Security patches
   - Feature improvements
   - Bug fixes

2. **Monitoring**
   - Performance tracking
   - Error logging
   - Usage statistics

3. **User Support**
   - Documentation
   - Troubleshooting guide
   - Contact information
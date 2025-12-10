# 🛡️ VNIT Girl's Safety

A comprehensive safety application designed for VNIT students, featuring real-time SOS alerts, location tracking, emergency contacts management, and safety analytics.

## ✨ Features

### 👤 User Features
- **🚨 SOS Alert System**: Quick emergency alert with drag-to-select emergency type (Medical, Harassment, General)
- **📍 Real-time Location Tracking**: Live location sharing during emergencies
- **👥 Emergency Contacts**: Manage and notify emergency contacts instantly
- **🗺️ Safe Zone Mapping**: View safe zones and emergency services on an interactive map
- **📱 Progressive Web App**: Install on mobile devices for quick access
- **🔐 Secure Authentication**: Firebase-based authentication system

### 👨‍💼 Admin Features
- **📊 Analytics Dashboard**: Monitor and analyze safety incidents
- **🗺️ Incident Mapping**: View all incidents on an interactive map
- **👤 User Management**: Manage user accounts and permissions
- **📈 Real-time Statistics**: Track active alerts and response times
- **🔔 Alert Management**: Review and respond to emergency alerts

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Three.js & React Three Fiber** - 3D graphics and animations
- **Framer Motion** - Animation library
- **Zustand** - State management
- **React Router** - Client-side routing
- **React Leaflet** - Interactive maps

### Backend & Services
- **Firebase Authentication** - User authentication
- **Cloud Firestore** - Real-time database
- **Firebase Cloud Functions** - Serverless backend
- **Firebase Hosting** - Web hosting

### Additional Tools
- **PWA** - Progressive Web App capabilities
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git**
- **Firebase CLI** (for deployment)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/vnit-girls-safety.git
cd vnit-girls-safety
```

### 2. Install Dependencies

```bash
# Install main dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 3. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - Authentication (Email/Password)
   - Cloud Firestore
   - Cloud Functions
   - Hosting

3. Download your Firebase service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the file as `service-account.json` in the project root
   - **⚠️ IMPORTANT**: This file contains sensitive credentials and should NEVER be committed to Git

4. Get your Firebase web configuration:
   - Go to Project Settings → General
   - Under "Your apps", add a web app
   - Copy the Firebase configuration

### 4. Environment Configuration

Create a `.env` file in the project root with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Firebase Configuration Files

Update `.firebaserc` with your Firebase project ID:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 6. Database Setup

Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 7. Admin User Setup

To create an admin user, run the restore admin script:

```bash
# See RESTORE_ADMIN.md for detailed instructions
node scripts/restore-admin-local.js
```

## 💻 Development

### Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

## 📱 Mobile Access

For testing on mobile devices, see [MOBILE_GUIDE.md](./MOBILE_GUIDE.md) for instructions on accessing the development server from your mobile device.

## 🚀 Deployment

### Deploy to Firebase Hosting

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

Or deploy only hosting:
```bash
firebase deploy --only hosting
```

### Deploy Cloud Functions

```bash
firebase deploy --only functions
```

## 📂 Project Structure

```
vnit-girls-safety/
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components
│   ├── lib/              # Utility functions and configurations
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── App.tsx           # Main application component
├── functions/            # Firebase Cloud Functions
├── public/               # Static assets
├── scripts/              # Utility scripts
├── dist/                 # Production build output
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── firebase.json         # Firebase configuration
└── package.json          # Project dependencies
```

## 🔒 Security Considerations

### Files to NEVER Commit
- `service-account.json` - Contains Firebase admin credentials
- `.env` files - Contains API keys and secrets
- Any files with private keys or tokens

### Best Practices
1. Always use environment variables for sensitive data
2. Keep service account keys secure and rotate regularly
3. Review Firestore security rules before deployment
4. Enable Firebase App Check for production
5. Use HTTPS for all communication

## 🐛 Troubleshooting

### Common Issues

**Issue: Firebase Authentication Not Working**
- Check if Authentication is enabled in Firebase Console
- Verify environment variables are correctly set
- Ensure `.env` file is in the project root

**Issue: Firestore Permission Denied**
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Check if user is authenticated
- Verify security rules match your data structure

**Issue: Build Errors**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`
- Update dependencies: `npm update`

**Issue: Mobile App Not Loading**
- Ensure your mobile device is on the same network
- Use HTTPS if required (see `vite.config.ts` for SSL setup)
- Check firewall settings

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code
- `firebase deploy` - Deploy to Firebase
- `firebase emulators:start` - Run Firebase emulators locally

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team

## 🙏 Acknowledgments

- VNIT Nagpur for supporting student safety initiatives
- Firebase for backend infrastructure
- React and Vite communities for excellent tooling

---

**⚠️ Important Security Notice**: This application handles sensitive location and emergency data. Always ensure proper security measures are in place before deploying to production.

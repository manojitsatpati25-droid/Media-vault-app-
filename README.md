# Media Vault 📹 (`com.mediavault.app`)

A modern full-stack web application and mobile-ready platform for uploading, discovering, searching, and managing videos and images with phone number authentication, SMS verification, and AI content analysis powered by Gemini.

---

## 🌟 Key Features

- **📹 Video & Image Hub**: Browse, search, filter, and stream uploaded videos and images across all creators with real-time view and like counters.
- **📱 Phone Number Authentication**: Full SMS OTP verification flow with custom country code picker (`+1`, `+91`, `+44`, etc.) and personalized user channel profile management.
- **⚡ AI Metadata Generator (Gemini)**: Automatic title, description, category, and tag generation from media content.
- **💬 Interactive Comments**: Engage with verified creator comments on all media items.
- **📱 Android-Ready Package**: Configured with `com.mediavault.app` package name and Firebase integration support (`google-services.json` ready).
- **⚙️ GitHub Actions CI/CD**: Automated linting and build validation workflow included in `.github/workflows/main.yml`.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` for server-side AI metadata generation.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:3000`.

---

## 🛠️ Build & Scripts

- `npm run dev`: Starts the Express + Vite server with TypeScript support.
- `npm run build`: Compiles static client assets and bundles the server entry point (`dist/server.cjs`).
- `npm run lint`: Performs TypeScript type checks (`tsc --noEmit`).
- `npm start`: Runs the production bundled server (`node dist/server.cjs`).

---

## 📱 How to Build the Android APK File

The app is pre-configured with **Capacitor** and package name `com.mediavault.app`. You have 3 easy ways to build the `.apk`:

### Option 1: Automatic Build via GitHub Actions (No Android Studio needed)
1. Push this repository to your GitHub account.
2. Go to the **Actions** tab on your GitHub repository.
3. Select the **Build Android APK** workflow and click **Run workflow** (or simply push code to `main`).
4. Once completed, scroll to the **Artifacts** section at the bottom of the run page and download `media-vault-debug-apk` to get your `app-debug.apk` file!

### Option 2: Local Build using Android Studio
1. Install [Android Studio](https://developer.android.com/studio).
2. Build the web app and initialize the Android project:
   ```bash
   npm run cap:add
   npm run cap:sync
   ```
3. Open the project in Android Studio:
   ```bash
   npm run cap:open
   ```
4. In Android Studio:
   - Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Once the build finishes, click **locate** in the notification popup to get your `.apk` file.

### Option 3: Command Line Gradle Build
```bash
# Build web assets and sync Android
npm run cap:add
npm run cap:sync

# Build APK using Gradle wrapper
cd android
./gradlew assembleDebug

# Output APK path:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📱 How to Export or Push to GitHub

To push this project to your GitHub repository:

1. **Via AI Studio Settings Menu**:
   - Click the **Settings / Export** menu in AI Studio.
   - Select **Export to GitHub** or **Download ZIP**.

2. **Via Git CLI**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Media Vault app with phone authentication"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

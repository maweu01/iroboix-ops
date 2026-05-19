# iRobotix Ops

A real-world operations platform for drone repair, inventory, client management, and basic GIS field notes. Designed to work fully offline and sync via Firebase.

## Modules

- **Repairs**: Drone repair management system.
- **Inventory**: Fleet and spare parts inventory. 
- **Clients**: Client portal and CRM directory.
- **GIS Field Notes**: Lightweight mapping notes and field operations logs.

## Built With

- React (Vite)
- Tailwind CSS
- Firebase (Auth, Firestore)
- PWA (vite-plugin-pwa)
- IndexedDB (idb)

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```

## Firebase Setup

1. Enable **Authentication** in Firebase (Email/Password must be enabled).
2. Deploy Firestore Rules:
   ```bash
   npm run deploy:rules
   ```

## Production & Vercel

1. Push to GitHub
2. Import project into Vercel
3. Ensure `.env` vars are mapped if necessary (for APIs or custom configurations not stored in client payload).
4. Vercel will auto-detect Vite as the framework. Output directory `dist`.

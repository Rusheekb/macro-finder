# MacroFinder 🥗

A smart nutrition discovery app that helps you find foods matching your macro targets for bulking or cutting goals. Built with React, TypeScript, Tailwind CSS, and Supabase.

## ✨ Features

- **Smart Mode Selection**: Switch between bulking and cutting with optimized defaults
- **Macro Targeting**: Set precise protein and calorie goals  
- **Weighted Scoring**: Customize importance of protein match, calories, and distance
- **Location-Based**: Find foods within your specified radius
- **Price Filtering**: Set budget caps for affordable options
- **Shareable URLs**: All search parameters saved in URL for easy sharing
- **Responsive Design**: Beautiful mobile-first interface with dark mode

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components  
- **Routing**: React Router v6 with URL state management
- **Backend**: Supabase (database + auth + edge functions)
- **APIs**: Nutritionix, Yelp, Google Maps integration ready

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Lovable Cloud (Supabase integration already configured)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/macro-finder.git
   cd macro-finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Add your external API keys (Nutritionix, Yelp, Google Maps)
   ```

4. **Database setup**
   The database schema is already migrated via Lovable Cloud. To seed sample data:
   ```bash
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ControlsPanel.tsx # Macro targets and search controls
│   ├── ResultsTable.tsx  # Ranked food results display
│   ├── Loader.tsx       # Loading skeleton components
│   └── ui/              # shadcn/ui base components
├── pages/
│   ├── Landing.tsx      # Mode selection and intro
│   ├── MacroApp.tsx     # Main application interface
│   └── NotFound.tsx     # 404 error page
├── api/
│   └── rank.ts          # Food ranking algorithm & API types
├── lib/
│   └── utils.ts         # Utility functions
└── hooks/               # Custom React hooks
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run db:seed` - Seed database with sample data

## 🌐 API Integration

The app is designed to integrate with multiple food and location APIs:

### Nutritionix API
- Comprehensive food nutrition database
- Restaurant menu items and nutritional data

### Yelp Fusion API  
- Restaurant locations and details
- Reviews, ratings, and contact info

### Google Maps API
- Distance calculations between user and restaurants
- Geocoding for address lookups

## 📊 Scoring Algorithm

Foods are ranked using a weighted scoring system:

```typescript
score = (wP × proteinMatch) + (wC × calorieMatch) + (wR × distanceScore)
```

Where:
- `proteinMatch`: How close food protein is to target (0-1)
- `calorieMatch`: How close food calories are to target (0-1)  
- `distanceScore`: Proximity score based on distance (0-1)
- `wP`, `wC`, `wR`: User-defined weights for each factor

## 🎨 Design System

The app uses a cohesive design system with:
- **Colors**: Green primary theme for health/fitness
- **Typography**: Clean, readable font hierarchy
- **Components**: Consistent spacing, shadows, and rounded corners
- **Responsive**: Mobile-first with breakpoint optimization
- **Dark Mode**: Automatic theme switching support

## 🚧 Roadmap

- [ ] Complete API integrations (Nutritionix, Yelp, Google Maps)
- [ ] User authentication and saved preferences  
- [ ] Meal planning and favorites system
- [ ] Nutritional goal tracking over time
- [ ] Social sharing of macro discoveries
- [ ] Advanced filtering (dietary restrictions, cuisine types)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
# Elite RI Agent

A Relationship Intelligence platform that automatically syncs and processes meeting data from Granola, enriching contact information and tracking interactions.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Background Jobs**: Trigger.dev for scheduled tasks
- **AI**: OpenAI API for meeting summarization and extraction
- **Deployment**: Coolify (self-hosted) or Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Supabase account and project
- Trigger.dev account and project

### Installation

```bash
# Install dependencies
npm ci

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public URL of your app (e.g., `https://ri.elite.community`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret key |
| `OPENAI_API_KEY` | OpenAI API key |

### Development

```bash
# Start Next.js development server
npm run dev

# Start Trigger.dev development mode (in separate terminal)
npm run trigger:dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.ts
```

## Deployment

### Deployment Sequence

The correct deployment sequence for this project is:

1. **Build the Next.js application** - Compiles the frontend and API routes
2. **Deploy Trigger.dev tasks** - Registers scheduled tasks with Trigger.dev

```bash
# Full deployment (recommended)
npm run deploy:all

# Or deploy separately:
npm run build          # Build Next.js
npm run trigger:deploy # Deploy Trigger.dev tasks
```

### Coolify Deployment

For Coolify (self-hosted) deployments:

1. Set `NEXT_PUBLIC_APP_URL` to your public domain (e.g., `https://ri.elite.community`)
2. Configure the build command: `npm run build`
3. Configure the start command: `npm start`
4. Deploy Trigger.dev tasks separately: `npm run trigger:deploy`

**Important**: Trigger.dev tasks must be deployed after the main application is deployed. The `nixpacks.toml` handles the main app build, but Trigger.dev deployment should be run either:
- Manually via `npm run trigger:deploy`
- Via CI/CD pipeline after successful Coolify deployment

### Vercel Deployment

For Vercel deployments:

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Vercel automatically detects Next.js and uses `npm run build`
4. Deploy Trigger.dev tasks: `npm run trigger:deploy`

**Note**: `VERCEL_URL` is automatically set by Vercel and used as a fallback if `NEXT_PUBLIC_APP_URL` is not configured.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Authentication-related pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API route handlers
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Core utilities and helpers
│   ├── meetings/         # Meeting-related database operations
│   ├── supabase/         # Supabase client configuration
│   └── url.ts            # URL utilities for redirects
├── trigger/              # Trigger.dev background tasks
│   ├── meeting-dispatcher.ts  # Hourly cron for dispatching per-user tasks
│   └── sync-granola-meetings.ts  # Per-user meeting sync
└── __tests__/            # Test files mirroring src structure
```

## Background Jobs

The application uses Trigger.dev for scheduled background processing:

- **meeting-processing-dispatcher**: Runs hourly, checks each user's processing schedule, and triggers per-user sync tasks
- **sync-granola-meetings**: Per-user task that fetches new meetings from Granola, processes them, and extracts action items

### Processing Schedule

Users can configure their processing schedule in `user_settings.processing_schedule`:

```json
{
  "interval_hours": 2,
  "start_hour": 8,
  "end_hour": 20,
  "timezone": "America/Los_Angeles"
}
```

This configuration processes meetings every 2 hours between 8 AM and 8 PM in the user's timezone.

## Database Schema

Key tables:

- `contacts` - Contact information
- `meetings` - Meeting records from Granola
- `contact_meetings` - Junction table linking contacts to meetings
- `action_items` - Extracted action items from meetings
- `user_settings` - User configuration including processing schedule

All tables use Row Level Security (RLS) to ensure users can only access their own data.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

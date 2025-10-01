# JARVIS MVP Setup Guide

## 🚀 Quick Setup

### 1. Install Dependencies
Dependencies are already configured in package.json. Run:
```bash
npm install
```

### 2. Configure Environment Variables
Update `.env.local` with your API keys:

```env
# Required: OpenAI API Key for transcription and LLM
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required: Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Set Up Supabase Database
1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL commands from `supabase-schema.sql` to create the sessions table

### 4. Configure Authentication (Optional)
To enable Google/GitHub OAuth:
1. In Supabase dashboard, go to Authentication > Providers
2. Enable Google and/or GitHub providers
3. Configure OAuth apps in Google/GitHub console
4. Add redirect URLs: `https://your-project.supabase.co/auth/v1/callback`

### 5. Run the Application
```bash
npm run dev
```

Visit http://localhost:3000

## 🎯 Features Implemented

✅ **Authentication System**
- Email/password signup and login
- OAuth support (Google, GitHub)
- Protected routes with session management

✅ **Voice-First Interface**
- Push-to-talk voice recording
- Whisper transcription via OpenAI
- Three modes: Listen, Interrupt, Step

✅ **Intelligent Canvas**
- Visual representation of ideas as nodes
- Problem, User, Metric, Feature node types
- Real-time updates from JARVIS responses
- Drag-and-drop interface using React Flow

✅ **Critical Thinking AI**
- GPT-4o-mini powered JARVIS
- Structured responses with canvas updates
- Mode-specific behavior (questioning vs listening)

✅ **Artifacts Generation**
- Generate PRD (Product Requirements Document)
- Create pitch deck outlines
- Generate prompt packs for code/design/research

✅ **Session Management**
- Save and load thinking sessions
- Persistent storage in Supabase
- Session history and management

## 🧠 How to Use JARVIS

1. **Sign up/Login** - Create an account or login
2. **Choose Mode**:
   - **LISTEN**: JARVIS captures your ideas without interrupting
   - **STEP**: JARVIS asks one targeted question per turn
   - **INTERRUPT**: JARVIS interjects with critiques during longer inputs
3. **Start Talking** - Click the microphone and speak your idea
4. **Watch the Canvas** - See your ideas visualized as connected nodes
5. **Generate Artifacts** - Click "Make Artifacts" to get PRDs and prompt packs

## 🎬 Demo Flow

1. Start with: "I want to build a football app for amateur teams"
2. Switch to STEP mode
3. JARVIS will ask clarifying questions
4. Watch nodes appear on the canvas
5. Generate artifacts when ready

## 🔧 Troubleshooting

**Voice input not working?**
- Check microphone permissions in browser
- Ensure HTTPS connection (required for microphone access)

**Supabase errors?**
- Verify environment variables are set correctly
- Check that the database schema was applied
- Ensure RLS policies are enabled

**OpenAI errors?**
- Verify API key is valid and has credits
- Check API key permissions for Audio and Chat

## 🛣️ Next Steps

The MVP is ready for your hackathon demo! Future enhancements could include:
- Screen wireframe nodes
- Export to SVG/PNG
- Advanced integrations (Figma, GitHub, Notion)
- Multi-user collaboration
- Enhanced AI reasoning modes

Good luck at the hackathon! 🚀
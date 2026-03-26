# ME-CHANIC — AI Vehicle Triage

Get a ranked diagnosis, cost estimate, and repair plan **before** you spend shop money.

## What is ME-CHANIC?

ME-CHANIC is a free AI-powered tool that helps car owners understand what's wrong with their vehicle. Upload your fault codes, describe your symptoms, and get:

- A ranked list of probable causes (with confidence scores)
- Estimated DIY, shop, and worst-case repair costs for your ZIP code
- A step-by-step repair plan
- A script to confidently discuss the issue with a mechanic

**No account. No ads. Works offline in demo mode.**

## Features

- 🚗 **VIN Lookup** — Automatic NHTSA vehicle data extraction
- 🔌 **Scan Code Parser** — Input fault codes (DTCs), pending codes, freeze frame data
- 🎤 **Media Upload** — Optional: engine audio, under-hood video, dashboard photos
- 🧠 **AI Diagnosis** — GPT-4 powered analysis of your vehicle's issues
- 💰 **Cost Estimates** — Regional pricing based on your ZIP code
- 📋 **Repair Plan** — Actionable next steps prioritized by urgency
- ✅ **Demo Mode** — Full functionality without an API key

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- (Optional) OpenAI API key for live AI analysis

### Installation

```bash
# Clone the repo
git clone https://github.com/Papjamzzz/me-chanic.git
cd me-chanic

# Install dependencies
npm install

# Create your local environment
cp .env.local.example .env.local

# Add your OpenAI API key (optional)
# Edit .env.local and paste your key
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app works fully in **demo mode** without an API key. To enable live AI analysis, add your OpenAI API key to `.env.local`.

## Environment Variables

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=sk-...your-key-here
```

Get a free key at [https://platform.openai.com](https://platform.openai.com).

Without this key, ME-CHANIC uses built-in demo results.

## Deployment

### Deploy to Vercel (Free)

```bash
npm run build
vercel deploy
```

Or connect your GitHub repo to Vercel for automatic deploys.

[Learn more](https://vercel.com/docs/frameworks/nextjs)

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling (dark theme)
- **OpenAI API** (gpt-4o) for diagnosis
- **NHTSA VIN Decoder API** for vehicle info

## Architecture

```
├── app/
│   ├── page.tsx          # Main app logic (step management, API calls)
│   ├── layout.tsx        # Root layout + metadata
│   ├── globals.css       # Dark theme styles + animations
│   └── api/
│       └── diagnose/     # POST endpoint for AI analysis
├── components/           # React components (one per step)
├── lib/
│   └── types.ts          # TypeScript interfaces
└── public/               # Static assets
```

## How It Works

1. **Vehicle Data** — Enter your VIN (auto-fills vehicle info) or manually select year/make/model
2. **Scan Codes** — Input fault codes from your OBD-II scanner or mechanic
3. **Symptoms** — Describe when/how the problem occurs
4. **Media** — (Optional) Upload engine sound, dash photos, etc.
5. **AI Analysis** — Backend sends data to GPT-4 for diagnosis
6. **Report** — View ranked causes, costs, and repair plan

## Demo Mode

If no `OPENAI_API_KEY` is set, the app generates realistic demo results based on:

- Fault code patterns (P03xx = misfires, P02xx = fuel/emissions, etc.)
- Reported symptoms
- Regional cost estimates

Perfect for testing without spending on API credits.

## Privacy

- **No account required** — All data is processed per-session
- **No tracking** — Zero analytics or user profiling
- **Open source** — Full source available on GitHub

API calls go directly to OpenAI (if using live mode). Refer to their [privacy policy](https://openai.com/policies/privacy-policy).

## Known Limitations

- AI diagnosis is **informational only**, not a professional inspection
- Cost estimates are rough regional averages
- Complex issues may require in-person diagnosis
- Some older vehicles may have incomplete NHTSA data

## Contributing

Found a bug? Have a feature request? Open an issue on GitHub:

[Papjamzzz/me-chanic](https://github.com/Papjamzzz/me-chanic)

## License

MIT — See LICENSE file for details.

## Disclaimer

ME-CHANIC is an AI-powered tool for educational purposes only. It is **not** a substitute for professional automotive repair or diagnosis. Always consult a certified mechanic before spending money on repairs.

---

**Questions?** Check the [FAQ](https://github.com/Papjamzzz/me-chanic/discussions) or open an issue.

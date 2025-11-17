# Clipping.AI

**AI-Powered Competitive Intelligence Platform**

Generate premium business intelligence reports automatically using Claude, OpenAI, and web search.

## Status

🚀 **Core MVP Functional** - End-to-end AI report generation working  
✅ **Demo Ready** - Full user journey from landing to report viewing  
📊 **8/14 Features Complete**

## Quick Start

```bash
# 1. Install
pnpm install

# 2. Setup environment
cp .env.example .env
# Add your API keys to .env

# 3. Run
pnpm --filter @clippingai/api dev     # Terminal 1
VITE_PORT=5173 pnpm --filter @clippingai/web dev  # Terminal 2

# 4. Visit
open http://localhost:5173
```

## Documentation

📖 **[Read HANDOVER.md](./HANDOVER.md)** - Complete project documentation

The handover document includes everything you need to know:
- Detailed architecture
- Setup instructions
- Testing procedures
- What's next (prioritized)
- Known issues
- All key files explained

## Quick Demo

```bash
# Test with these emails
test@anthropic.com
test@stripe.com
test@vercel.com

# Flow: Landing → Detect → Verify → Generate (~2 min) → View Report
```

---

Built with Claude Code 🤖

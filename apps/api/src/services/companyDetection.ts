import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export interface CompanyInfo {
  name: string;
  domain: string;
  website: string;
  description?: string;
  industry?: string;
  logo?: string;
  logoVariant?: 'light' | 'dark' | 'unknown';
  logoOptions?: Array<{
    url: string;
    source: string;
  }>;
  competitors?: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect company from email domain
 */
export async function detectCompanyFromEmail(email: string): Promise<CompanyInfo> {
  try {
    // Extract domain from email
    const domain = email.split('@')[1];

    if (!domain) {
      throw new Error('Invalid email format');
    }

    // Skip common email providers
    const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    if (commonProviders.includes(domain.toLowerCase())) {
      return {
        name: 'Personal Email',
        domain,
        website: '',
        confidence: 'low',
        description: 'This appears to be a personal email address. Please provide your company information manually.',
      };
    }

    // Try to fetch company website
    const website = `https://${domain}`;
    let companyData = await scrapeCompanyWebsite(website);

    if (!companyData) {
      // If scraping fails, use Claude to generate best guesses
      companyData = await generateCompanyInfo(domain);
    }

    return {
      ...companyData,
      domain,
      website,
      confidence: companyData.logo ? 'high' : 'medium',
    };
  } catch (error) {
    console.error('Error detecting company:', error);
    throw error;
  }
}

/**
 * Scrape company website for logo and info
 */
async function scrapeCompanyWebsite(url: string): Promise<Partial<CompanyInfo> | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClippingAI/1.0; +https://clipping.ai)',
      },
      timeout: 5000,
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏢 [CompanyDetection] Scraping: ${url}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📄 [CompanyDetection] HTML length: ${html.length} chars`);

    // PRIMARY: Use Gemini to intelligently extract name and logo from HTML
    const geminiExtraction = await extractWithGemini(html, url);

    // FALLBACK for name: meta tags and title parsing
    let name = geminiExtraction.name || '';
    if (!name) {
      const titleText = $('title').text();
      const cleanedTitle = titleText.split(/[-|—–·]/)[0].trim();
      name =
        $('meta[property="og:site_name"]').attr('content') ||
        $('meta[name="application-name"]').attr('content') ||
        cleanedTitle ||
        '';
      console.log(`🔄 [CompanyDetection] Name fallback used: "${name}"`);
    }

    // Extract description from meta tags
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    // Use Gemini extraction for logo
    let logo = geminiExtraction.logo || '';
    let logoVariant = geminiExtraction.logoVariant;

    // Fallback: og:image (often a marketing banner, but better than nothing)
    if (!logo) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        logo = ogImage.startsWith('http') ? ogImage : new URL(ogImage, new URL(url).origin).toString();
        logoVariant = 'unknown'; // og:image variant is unknown
        console.log(`⚠️ [CompanyDetection] Using og:image fallback: ${logo}`);
      }
    }

    console.log(`\n📊 [CompanyDetection] FINAL RESULT:`);
    console.log(`   Name: "${name}"`);
    console.log(`   Logo: "${logo}" (${logoVariant})`);
    console.log(`   Description: "${description?.slice(0, 80)}..."`);
    console.log(`${'='.repeat(60)}\n`);

    // Use Claude to analyze the page content and extract additional info (industry, competitors)
    const pageAnalysis = await analyzePageWithClaude($('body').text().slice(0, 5000), url);

    return {
      name: name || pageAnalysis.name,
      description: description || pageAnalysis.description,
      industry: pageAnalysis.industry,
      competitors: pageAnalysis.competitors,
      logo: logo || undefined,
      logoVariant: logo ? logoVariant : undefined,
    };
  } catch (error) {
    console.error('Error scraping website:', error);
    return null;
  }
}

interface GeminiExtraction {
  name: string | null;
  logo: string | null;
  logoVariant: 'light' | 'dark' | 'unknown';
}

/**
 * Use Gemini Flash to intelligently extract company name AND logo from HTML
 * This is the primary extraction method - LLM understands context better than regex
 */
async function extractWithGemini(html: string, url: string): Promise<GeminiExtraction> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Truncate HTML to avoid token limits (keep header and first part of body)
    const truncatedHtml = html.slice(0, 20000);

    // Pre-extract potential logo URLs from HTML to help Gemini
    const logoRegex = /["']([^"']*logo[^"']*\.(?:png|jpg|jpeg|svg|webp))["']/gi;
    const logoMatches = [...html.matchAll(logoRegex)].map(m => m[1]);
    const uniqueLogoUrls = [...new Set(logoMatches)].slice(0, 10);

    // Sort logos: dark/black/color first, then neutral, then white/light last
    const sortedLogoUrls = uniqueLogoUrls.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const isDarkA = aLower.includes('dark') || aLower.includes('black') || aLower.includes('color');
      const isDarkB = bLower.includes('dark') || bLower.includes('black') || bLower.includes('color');
      const isLightA = aLower.includes('white') || aLower.includes('light');
      const isLightB = bLower.includes('white') || bLower.includes('light');

      if (isDarkA && !isDarkB) return -1;
      if (isDarkB && !isDarkA) return 1;
      if (isLightA && !isLightB) return 1;
      if (isLightB && !isLightA) return -1;
      return 0;
    }).slice(0, 5);

    console.log(`🔎 [Gemini] Pre-extracted logo candidates (sorted, dark first):`, sortedLogoUrls);

    const logoHint = sortedLogoUrls.length > 0
      ? `\n\n**I FOUND THESE URLs WITH "logo" IN THE FILENAME (sorted: dark logos first, white logos last):**\n${sortedLogoUrls.map(u => `- ${u}`).join('\n')}\n\nPick the FIRST suitable one (prefer dark/color logos for white background). Convert to absolute URL.`
      : '';

    const prompt = `Analyze this HTML from ${url} and extract the company name and logo.${logoHint}

## COMPANY NAME
Find the actual company/brand name. Rules:
- Return ONLY the name (e.g., "Stripe", "Notion", "Figma")
- Do NOT include taglines, slogans, or descriptions
- Do NOT include separators like " - ", " | ", " — "
- If the title is "Acme - Build faster", return "Acme"
- If the title is "Welcome to Acme Inc.", return "Acme"
- Look at: <title>, og:site_name, header text, logo alt text

## LOGO - READ CAREFULLY

I need you to find the company's logo. The logo will be displayed on a WHITE/LIGHT background, so prefer DARK logos.

**STEP 1: GREP THE HTML FOR "logo"**
Scan the entire HTML text for any string containing "logo" (case insensitive).
Look for patterns like:
- src="...logo..."
- href="...logo..."
- url(...logo...)
- Any path/filename containing "logo"

**STEP 2: CHOOSE THE RIGHT LOGO VARIANT**
Many companies have multiple logo versions. PREFER in this order:
1. logo-dark, logo-black, logo-color (BEST for white background)
2. logo.png, logo.svg (neutral)
3. logo-white, logo-light (AVOID - won't be visible on white background)

**STEP 3: IF YOU FIND A URL WITH "logo" IN IT, RETURN THE DARK VERSION**
Examples:
- If you see both "/logo-white.png" and "/logo-dark.png" → return the DARK one
- If you see both "/logo-light.svg" and "/logo.svg" → return logo.svg
- /images/logo.svg → return ${url}/images/logo.svg

**STEP 4: WHAT TO NEVER RETURN**
NEVER return these:
- og-image.png or og-image.jpg (social media preview, NOT a logo)
- og:image meta content (this is a banner, NOT a logo)
- opengraph images, twitter:image, hero images
- homepage.png or similar marketing images
- White/light logos if a dark version exists

**IF NO LOGO FOUND:** Return null. Do NOT guess or return og:image as fallback.

HTML:
${truncatedHtml}

Return ONLY valid JSON:
{
  "name": "Company Name" or null,
  "logo": "https://example.com/path/to/logo.png" or null,
  "logoVariant": "light" or "dark" or "unknown"
}

**logoVariant rules:**
- "light" = white/light colored logo (needs dark background to be visible)
- "dark" = black/dark/colored logo (works on white background)
- "unknown" = can't determine from filename`;

    console.log(`\n🔍 [Gemini] Analyzing HTML from ${url} (${truncatedHtml.length} chars)`);

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    console.log(`📝 [Gemini] Raw response:\n${response}\n`);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ [Gemini] No JSON found in response');
      return { name: null, logo: null, logoVariant: 'unknown' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`✅ [Gemini] Parsed: name="${parsed.name}", logo="${parsed.logo}", variant="${parsed.logoVariant}"`);

    // Clean up logo URL
    let logoUrl = parsed.logo;
    if (logoUrl && !logoUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      logoUrl = new URL(logoUrl, baseUrl.origin).toString();
      console.log(`🔗 [Gemini] Converted relative URL to: ${logoUrl}`);
    }

    // Determine logoVariant from filename if Gemini didn't specify
    let logoVariant: 'light' | 'dark' | 'unknown' = parsed.logoVariant || 'unknown';
    if (logoUrl && logoVariant === 'unknown') {
      const lowerUrl = logoUrl.toLowerCase();
      if (lowerUrl.includes('white') || lowerUrl.includes('light')) {
        logoVariant = 'light';
      } else if (lowerUrl.includes('dark') || lowerUrl.includes('black') || lowerUrl.includes('color')) {
        logoVariant = 'dark';
      }
    }

    return {
      name: parsed.name || null,
      logo: logoUrl || null,
      logoVariant,
    };
  } catch (error) {
    console.error('❌ [Gemini] Error extracting:', error);
    return { name: null, logo: null, logoVariant: 'unknown' };
  }
}

/**
 * Use Claude to analyze webpage content
 */
async function analyzePageWithClaude(pageContent: string, url: string) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze this company website and extract key information. Return ONLY valid JSON.

Website URL: ${url}
Page Content (first 5000 chars):
${pageContent}

Extract:
1. Company name (EXTREMELY IMPORTANT: Return JUST the name. Do NOT include taglines, slogans, separators like " - ", or SEO keywords. Example: "Tesla", NOT "Tesla - Electric Cars")
2. Brief description (1-2 sentences)
3. Industry/sector
4. Top 3 potential competitors (if you can infer from the content)

Return format:
{
  "name": "Company Name",
  "description": "Brief description",
  "industry": "Industry name",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"]
}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { name: '', description: '', industry: '', competitors: [] };
  } catch (error) {
    console.error('Error analyzing page with Claude:', error);
    return { name: '', description: '', industry: '', competitors: [] };
  }
}

/**
 * Generate company info using Claude when website scraping fails
 */
async function generateCompanyInfo(domain: string): Promise<Partial<CompanyInfo>> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Based on the domain "${domain}", provide your best guess about this company. Return ONLY valid JSON.

Infer:
1. Company name (from domain, clean name only, no taglines)
2. Likely industry/sector
3. Brief description of what they might do
4. Potential competitors in that space

Return format:
{
  "name": "Company Name",
  "description": "What they likely do",
  "industry": "Industry",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"]
}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: just capitalize domain name
    const name = domain.split('.')[0];
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: 'Company information could not be automatically detected.',
      industry: 'Unknown',
      competitors: [],
    };
  } catch (error) {
    console.error('Error generating company info:', error);
    const name = domain.split('.')[0];
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: 'Company information could not be automatically detected.',
      industry: 'Unknown',
      competitors: [],
    };
  }
}

/**
 * Search for company logo alternatives
 * Note: Clearbit removed - often returns wrong logos for companies with common domain names
 */
export async function searchCompanyLogos(companyName: string, domain: string): Promise<string[]> {
  // This function is kept for API compatibility but we rely on Gemini extraction now
  return [];
}

/**
 * Process manual company input using Claude
 */
export async function processManualCompanyInput(input: string): Promise<CompanyInfo> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `A user is describing their company. Extract structured information. Return ONLY valid JSON.

User input: "${input}"

Extract:
1. Company name
2. Website/domain (if mentioned, or guess from company name)
3. Description
4. Industry
5. Potential competitors

Return format:
{
  "name": "Company Name",
  "domain": "company.com",
  "website": "https://company.com",
  "description": "What they do",
  "industry": "Industry",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"]
}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        ...data,
        confidence: 'medium' as const,
      };
    }

    throw new Error('Failed to parse company information');
  } catch (error) {
    console.error('Error processing manual input:', error);
    throw error;
  }
}

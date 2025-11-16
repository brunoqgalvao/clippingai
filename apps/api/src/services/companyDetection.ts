import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface CompanyInfo {
  name: string;
  domain: string;
  website: string;
  description?: string;
  industry?: string;
  logo?: string;
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

    // Extract company name from various meta tags
    const name =
      $('meta[property="og:site_name"]').attr('content') ||
      $('meta[name="application-name"]').attr('content') ||
      $('title').text().split('-')[0].trim() ||
      '';

    // Extract description
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    // Try to find logo
    let logo =
      $('meta[property="og:image"]').attr('content') ||
      $('link[rel="apple-touch-icon"]').attr('href') ||
      $('link[rel="icon"]').attr('href') ||
      '';

    // Make logo URL absolute
    if (logo && !logo.startsWith('http')) {
      const baseUrl = new URL(url);
      logo = new URL(logo, baseUrl.origin).toString();
    }

    // Use Claude to analyze the page content and extract additional info
    const pageAnalysis = await analyzePageWithClaude($('body').text().slice(0, 5000), url);

    return {
      name: name || pageAnalysis.name,
      description: description || pageAnalysis.description,
      industry: pageAnalysis.industry,
      competitors: pageAnalysis.competitors,
      logo: logo || undefined,
    };
  } catch (error) {
    console.error('Error scraping website:', error);
    return null;
  }
}

/**
 * Use Claude to analyze webpage content
 */
async function analyzePageWithClaude(pageContent: string, url: string) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze this company website and extract key information. Return ONLY valid JSON.

Website URL: ${url}
Page Content (first 5000 chars):
${pageContent}

Extract:
1. Company name
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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Based on the domain "${domain}", provide your best guess about this company. Return ONLY valid JSON.

Infer:
1. Company name (from domain)
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
 */
export async function searchCompanyLogos(companyName: string, domain: string): Promise<string[]> {
  try {
    // Try common logo sources
    const logoSources = [
      `https://logo.clearbit.com/${domain}`,
      `https://img.logo.dev/${domain}?token=pk_X-HbP2vQT3uUGщdoZJQ`, // Brandfetch alternative
      `https://api.brandfetch.io/v2/brands/${domain}`,
    ];

    // Return the sources as alternatives
    return logoSources;
  } catch (error) {
    console.error('Error searching for logos:', error);
    return [];
  }
}

/**
 * Process manual company input using Claude
 */
export async function processManualCompanyInput(input: string): Promise<CompanyInfo> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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

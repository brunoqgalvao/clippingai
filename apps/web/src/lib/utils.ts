/**
 * Utility functions for the application
 */

/**
 * Extracts clean company name from full descriptions
 * Handles formats like "Description | CompanyName" or "Description - CompanyName"
 */
export function getCleanCompanyName(fullName: string): string {
  if (!fullName) return '';

  // If there's a pipe separator, take the part after it (usually the company name)
  if (fullName.includes('|')) {
    return fullName.split('|').pop()?.trim() || fullName;
  }

  // If there's a dash, take the last part
  if (fullName.includes(' - ')) {
    return fullName.split(' - ').pop()?.trim() || fullName;
  }

  // Otherwise return as is
  return fullName.trim();
}

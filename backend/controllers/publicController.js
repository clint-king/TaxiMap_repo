/**
 * Public endpoints controller - no authentication required
 * These endpoints return public data only (no sensitive information)
 */
import ContributorModel from '../models/contributorModel.js';

// Get public contributors list (no sensitive data)
export const getPublicContributors = async (req, res) => {
  try {
    // Get optional query parameters (validated by middleware)
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // Fetch contributors
    let contributors = await ContributorModel.getPublicContributors();
    
    // Apply pagination if requested
    if (limit) {
      const start = offset;
      const end = offset + limit;
      contributors = contributors.slice(start, end);
    }
    
    // Security: Limit response size to prevent DoS
    const MAX_CONTRIBUTORS = 1000;
    if (contributors.length > MAX_CONTRIBUTORS) {
      contributors = contributors.slice(0, MAX_CONTRIBUTORS);
    }
    
    // Return response with security headers
    res.set({
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
    
    res.json({ 
      contributors,
      total: contributors.length,
      // Don't expose internal IDs or sensitive info
      // Only return what's needed for display
    });
  } catch (error) {
    // Don't leak error details to prevent information disclosure
    console.error('Error fetching public contributors:', error);
    res.status(500).json({ 
      error: 'Unable to fetch contributors at this time. Please try again later.' 
    });
  }
};

export default {
  getPublicContributors
};


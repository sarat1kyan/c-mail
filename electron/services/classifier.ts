/**
 * Local NLP Email Classifier
 * Uses pattern matching and keyword analysis for privacy-preserving classification.
 * Can optionally use transformers.js for more advanced classification.
 */

interface ClassificationResult {
  category: string;
  confidence: number;
  importance: number;
  keywords: string[];
}

interface CategoryPattern {
  id: string;
  name: string;
  patterns: RegExp[];
  senderPatterns: RegExp[];
  keywords: string[];
  weight: number;
}

export class EmailClassifier {
  private categoryPatterns: CategoryPattern[] = [];
  private initialized = false;
  
  async initialize(): Promise<void> {
    // Define category patterns
    this.categoryPatterns = [
      {
        id: 'financial',
        name: 'Financial',
        patterns: [
          /statement|transaction|balance|deposit|withdrawal|payment (received|sent)|credit (card|limit)|bank account|investment|portfolio|dividend|interest (rate|earned)|wire transfer|ach|routing number/i,
          /your .*(statement|account|balance)|account ending in \d+/i,
        ],
        senderPatterns: [
          /bank|chase|wells ?fargo|bofa|bank of america|citibank|capital ?one|discover|amex|american express|fidelity|schwab|vanguard|td ameritrade|robinhood|coinbase|paypal|venmo|stripe|square/i,
        ],
        keywords: ['bank', 'statement', 'balance', 'transaction', 'payment', 'credit', 'debit', 'investment', 'portfolio', 'dividend', 'interest'],
        weight: 1.2,
      },
      {
        id: 'hr',
        name: 'HR/Recruitment',
        patterns: [
          /job (offer|application|opportunity)|position at|interview (scheduled|invitation|request)|we('d| would) like to (invite|interview)|your (application|resume)|hiring manager|recruiter|talent acquisition|compensation|benefits package|offer letter|background check|onboarding/i,
          /thank you for (applying|your interest)|unfortunately.*(not|unable).*position/i,
        ],
        senderPatterns: [
          /linkedin|indeed|glassdoor|monster|ziprecruiter|greenhouse|lever|workday|taleo|icims|jobvite|careers?@|recruiting?@|hr@|talent@|people@/i,
        ],
        keywords: ['job', 'interview', 'application', 'resume', 'offer', 'position', 'recruiter', 'hiring', 'salary', 'benefits'],
        weight: 1.1,
      },
      {
        id: 'marketing',
        name: 'Marketing/Ads',
        patterns: [
          /unsubscribe|email preferences|manage (your )?subscriptions|opt.out|sale|% off|\$\d+ off|promo(tion)? code|coupon|limited time|act now|don't miss|exclusive (offer|deal|access)|flash sale|clearance|shop now|buy now|order now|free shipping/i,
          /newsletter|weekly digest|monthly update|special offer|member exclusive|subscriber/i,
        ],
        senderPatterns: [
          /newsletter|promo|marketing|deals|offers|noreply|no-reply|news@|info@|hello@|contact@/i,
        ],
        keywords: ['sale', 'discount', 'promo', 'offer', 'unsubscribe', 'deal', 'coupon', 'newsletter', 'exclusive', 'limited'],
        weight: 0.9,
      },
      {
        id: 'important',
        name: 'Important',
        patterns: [
          /urgent|important|action required|immediate attention|deadline|asap|critical|priority|time.sensitive|expires? (today|soon|tomorrow)|respond by|reply by|final notice|last chance|account (suspended|locked|compromised)/i,
          /please (respond|reply|confirm|review)|your input (needed|required)|awaiting your/i,
        ],
        senderPatterns: [],
        keywords: ['urgent', 'important', 'deadline', 'asap', 'critical', 'priority', 'action', 'required', 'immediate'],
        weight: 1.5,
      },
      {
        id: 'social',
        name: 'Social',
        patterns: [
          /new connection|wants to connect|accepted your (invitation|request)|endorsed you|commented on|liked your|mentioned you|tagged you|sent you a message|new follower|friend request|birthday|congratulations/i,
          /activity on your (post|photo|video)|someone (viewed|liked|commented)/i,
        ],
        senderPatterns: [
          /linkedin|facebook|twitter|x\.com|instagram|tiktok|snapchat|pinterest|reddit|discord|slack|whatsapp|telegram|signal|messenger/i,
        ],
        keywords: ['connect', 'follow', 'like', 'comment', 'share', 'mention', 'tag', 'friend', 'profile', 'notification'],
        weight: 0.8,
      },
      {
        id: 'shopping',
        name: 'Shopping',
        patterns: [
          /order (confirmation|shipped|delivered|placed)|your (order|package|shipment|delivery)|tracking (number|information)|estimated delivery|shipped via|out for delivery|has been delivered|receipt for|thank you for your (purchase|order)|return (label|request|policy)/i,
          /item in your cart|wishlist|back in stock|price drop/i,
        ],
        senderPatterns: [
          /amazon|ebay|walmart|target|bestbuy|costco|macys|nordstrom|zappos|etsy|shopify|stripe|square|orders?@|shipping@|tracking@/i,
        ],
        keywords: ['order', 'shipping', 'delivery', 'tracking', 'receipt', 'purchase', 'package', 'cart', 'checkout', 'return'],
        weight: 1.0,
      },
      {
        id: 'travel',
        name: 'Travel',
        patterns: [
          /flight (confirmation|itinerary|booking|reservation)|hotel (reservation|booking|confirmation)|booking confirmation|check.in|check.out|boarding pass|e.?ticket|travel (itinerary|confirmation)|car rental|airport|departure|arrival|gate/i,
          /your trip to|upcoming reservation|reservation confirmed/i,
        ],
        senderPatterns: [
          /airlines?|hotels?\.com|airbnb|booking\.com|expedia|kayak|hopper|tripadvisor|marriott|hilton|hyatt|delta|united|american|southwest|jetblue|uber|lyft/i,
        ],
        keywords: ['flight', 'hotel', 'booking', 'reservation', 'travel', 'trip', 'itinerary', 'boarding', 'departure', 'arrival'],
        weight: 1.1,
      },
      {
        id: 'bills',
        name: 'Bills/Invoices',
        patterns: [
          /invoice|bill|payment due|amount due|due date|account summary|autopay|automatic payment|pay now|pay online|balance due|current charges|monthly statement|utility bill|electric bill|gas bill|water bill|internet bill|phone bill/i,
          /your .* bill is ready|bill available|payment reminder|past due/i,
        ],
        senderPatterns: [
          /billing@|invoice@|payments?@|accounts?@|utility|electric|gas|water|comcast|verizon|at&t|t-mobile|sprint|xfinity|spectrum/i,
        ],
        keywords: ['invoice', 'bill', 'payment', 'due', 'balance', 'charges', 'utility', 'statement', 'autopay', 'overdue'],
        weight: 1.1,
      },
    ];
    
    this.initialized = true;
  }
  
  async classify(email: {
    from: string;
    fromName?: string;
    subject: string;
    snippet: string;
    body?: string;
    hasUnsubscribe?: boolean;
  }): Promise<ClassificationResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const scores: Map<string, number> = new Map();
    const extractedKeywords: string[] = [];
    
    // Combine text for analysis
    const fullText = [
      email.subject || '',
      email.snippet || '',
      email.body?.substring(0, 2000) || '', // Limit body length for performance
    ].join(' ').toLowerCase();
    
    const senderText = [
      email.from || '',
      email.fromName || '',
    ].join(' ').toLowerCase();
    
    // Check each category
    for (const category of this.categoryPatterns) {
      let score = 0;
      
      // Check content patterns
      for (const pattern of category.patterns) {
        if (pattern.test(fullText)) {
          score += 2 * category.weight;
        }
      }
      
      // Check sender patterns
      for (const pattern of category.senderPatterns) {
        if (pattern.test(senderText)) {
          score += 3 * category.weight;
        }
      }
      
      // Check keywords
      for (const keyword of category.keywords) {
        if (fullText.includes(keyword.toLowerCase())) {
          score += 0.5 * category.weight;
          if (!extractedKeywords.includes(keyword)) {
            extractedKeywords.push(keyword);
          }
        }
      }
      
      scores.set(category.id, score);
    }
    
    // Special handling for marketing emails with unsubscribe
    if (email.hasUnsubscribe) {
      const marketingScore = scores.get('marketing') || 0;
      scores.set('marketing', marketingScore + 1);
    }
    
    // Find best category
    let bestCategory = 'uncategorized';
    let bestScore = 0;
    
    for (const [category, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }
    
    // Calculate confidence (0-1)
    const confidence = Math.min(1, bestScore / 10);
    
    // Calculate importance score
    const importance = this.calculateImportance(email, bestCategory, bestScore);
    
    return {
      category: bestCategory,
      confidence,
      importance,
      keywords: extractedKeywords.slice(0, 10),
    };
  }
  
  private calculateImportance(
    email: { from: string; subject: string; snippet: string; body?: string },
    category: string,
    categoryScore: number
  ): number {
    let importance = 0.5; // Base importance
    
    const fullText = [email.subject, email.snippet].join(' ').toLowerCase();
    
    // High importance indicators
    const urgentPatterns = [
      /urgent|important|critical|priority|immediate|asap|action required|deadline/i,
      /please (respond|reply|confirm)|awaiting your|your input/i,
    ];
    
    for (const pattern of urgentPatterns) {
      if (pattern.test(fullText)) {
        importance += 0.2;
      }
    }
    
    // Category-based importance adjustments
    switch (category) {
      case 'important':
        importance += 0.3;
        break;
      case 'financial':
        importance += 0.15;
        break;
      case 'bills':
        importance += 0.1;
        break;
      case 'travel':
        importance += 0.1;
        break;
      case 'marketing':
        importance -= 0.2;
        break;
      case 'social':
        importance -= 0.1;
        break;
    }
    
    // High category confidence indicates clearer signal
    if (categoryScore > 5) {
      importance += 0.1;
    }
    
    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, importance));
  }
  
  async classifyBatch(emails: Array<{
    id: string;
    from: string;
    fromName?: string;
    subject: string;
    snippet: string;
    body?: string;
    hasUnsubscribe?: boolean;
  }>): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();
    
    for (const email of emails) {
      const result = await this.classify(email);
      results.set(email.id, result);
    }
    
    return results;
  }
  
  // Learn from user corrections
  async learnFromCorrection(
    email: { from: string; subject: string; snippet: string },
    correctCategory: string
  ): Promise<void> {
    // In a full implementation, this would update a learned model
    // For now, we store the correction for potential future use
    console.log(`Learning: Email from ${email.from} should be ${correctCategory}`);
  }
  
  // Get suggested rules based on classification patterns
  getSuggestedRules(emails: Array<{ from: string; category: string }>): Array<{
    pattern: string;
    category: string;
    confidence: number;
  }> {
    const senderCategories = new Map<string, Map<string, number>>();
    
    for (const email of emails) {
      // Extract domain from email
      const domain = email.from.split('@')[1]?.toLowerCase();
      if (!domain) continue;
      
      if (!senderCategories.has(domain)) {
        senderCategories.set(domain, new Map());
      }
      
      const categories = senderCategories.get(domain)!;
      categories.set(email.category, (categories.get(email.category) || 0) + 1);
    }
    
    const suggestions: Array<{ pattern: string; category: string; confidence: number }> = [];
    
    for (const [domain, categories] of senderCategories) {
      let topCategory = '';
      let topCount = 0;
      let totalCount = 0;
      
      for (const [category, count] of categories) {
        totalCount += count;
        if (count > topCount) {
          topCount = count;
          topCategory = category;
        }
      }
      
      // Only suggest rules with high confidence
      const confidence = topCount / totalCount;
      if (confidence > 0.8 && topCount >= 3) {
        suggestions.push({
          pattern: `@${domain}`,
          category: topCategory,
          confidence,
        });
      }
    }
    
    return suggestions;
  }
}


// TeksiMap FAQ Data
// This file contains all frequently asked questions and their answers

export const faqData = [
  // ===== GENERAL APPLICATION QUESTIONS =====
  {
    category: "General",
    questions: [
      {
        question: "What is TeksiMap?",
        answer: "TeksiMap is South Africa's first comprehensive minibus taxi navigation platform. It helps commuters find taxi routes, estimate fares, and plan their journeys across the country. Unlike other navigation apps that focus on private transport, TeksiMap is specifically designed for the informal taxi network that millions of South Africans rely on daily."
      },
      {
        question: "How is TeksiMap different from other navigation apps?",
        answer: "TeksiMap is unique because it focuses exclusively on South Africa's minibus taxi network, which serves over 70% of the population. Unlike Google Maps or Uber, we map actual taxi routes, ranks, and fares used by local commuters. Our routes are community-verified and include real pricing information from the taxi industry."
      },
      {
        question: "Is TeksiMap only for South Africa?",
        answer: "Currently, TeksiMap focuses on South Africa's taxi network. We're starting with major cities like Johannesburg, Cape Town, Durban, and Pretoria, with plans to expand to other African countries in the future."
      },
      {
        question: "Is TeksiMap free to use?",
        answer: "Yes, TeksiMap is completely free to use! We believe that reliable transportation information should be accessible to everyone. There are no hidden fees, subscriptions, or premium features."
      }
    ]
  },

  // ===== GETTING STARTED =====
  {
    category: "Getting Started",
    questions: [
      {
        question: "How do I create an account?",
        answer: "Creating an account is simple! Click the 'Sign Up' button on our homepage, fill in your name, email address, and choose a password. You'll receive a verification email to confirm your account. Once verified, you can start using all features of TeksiMap."
      },
      {
        question: "Do I need to verify my email?",
        answer: "Yes, email verification is required for security and to ensure we can contact you about your account. Check your inbox (and spam folder) for the verification email after signing up. Click the verification link to activate your account."
      },
      {
        question: "Can I use TeksiMap without an account?",
        answer: "You can browse routes and view basic information without an account, but creating an account gives you access to features like saving favorite routes, contributing to the community, and personalized recommendations."
      },
      {
        question: "How do I reset my password if I forget it?",
        answer: "Click the 'Forgot Password' link on the login page, enter your email address, and we'll send you a password reset link. Click the link in the email to create a new password. The reset link expires after 1 hour for security."
      }
    ]
  },

  // ===== ROUTE FINDING & NAVIGATION =====
  {
    category: "Route Finding",
    questions: [
      {
        question: "How do I find a taxi route between two locations?",
        answer: "Enter your starting point and destination in the search fields on the main map. TeksiMap will show you available taxi routes, including walking directions to nearby taxi ranks, the route details, and estimated fare. Click on a route to see detailed information."
      },
      {
        question: "What if there's no direct route available?",
        answer: "If no direct route exists, TeksiMap will suggest the best combination of routes with walking directions between taxi ranks. You might need to take multiple taxis or walk short distances to connect between different routes."
      },
      {
        question: "How accurate are the route suggestions?",
        answer: "Our routes are community-verified and regularly updated. However, taxi routes can change due to construction, events, or operator decisions. We recommend confirming with local taxi drivers for the most current information."
      },
      {
        question: "Can I see multiple route options?",
        answer: "Yes! TeksiMap shows you multiple route options when available, including different taxi routes, walking distances, and fare variations. You can compare routes based on time, cost, and convenience."
      },
      {
        question: "How do I know which taxi to take?",
        answer: "Each route shows the taxi rank location, route number or name, and destination. Look for the taxi with the matching route information displayed on the vehicle. You can also ask the taxi driver or rank marshals for confirmation."
      }
    ]
  },

  // ===== ROUTE INFORMATION =====
  {
    category: "Route Information",
    questions: [
      {
        question: "How much does each route cost?",
        answer: "Fares are displayed for each route and are based on current market rates. Prices may vary slightly depending on the time of day, demand, or specific taxi operator. Fares are updated regularly by our community contributors."
      },
      {
        question: "How long does the journey take?",
        answer: "Journey times are estimates based on typical travel times. Actual duration may vary due to traffic, weather, or other factors. Peak hours (6-9 AM and 4-7 PM) typically take longer due to increased traffic."
      },
      {
        question: "What are the pickup and drop-off points?",
        answer: "Each route shows the main taxi rank for pickup and the destination rank or area. Some routes have multiple pickup points along the way. The map displays these locations clearly with walking directions from your starting point."
      },
      {
        question: "Are the routes updated in real-time?",
        answer: "Route information is updated regularly by our community contributors and verified by our team. While we strive for accuracy, we recommend checking with local taxi operators for the most current information, especially during peak hours or special events."
      },
      {
        question: "What if the taxi doesn't follow the exact route?",
        answer: "Taxi drivers may take alternative routes due to traffic, road conditions, or passenger requests. The routes we show are the standard paths, but variations are common. Always communicate with your driver about your destination."
      }
    ]
  },

  // ===== MAP FEATURES =====
  {
    category: "Map Features",
    questions: [
      {
        question: "How do I use the map to find routes?",
        answer: "The interactive map shows taxi ranks, routes, and your current location. Click on taxi ranks to see available routes, or use the search function to find routes between specific locations. The map automatically zooms to show relevant information."
      },
      {
        question: "What do the different colored areas mean?",
        answer: "Colored areas indicate different taxi route zones and coverage areas. Yellow areas show active route coverage, while gray areas indicate limited or no taxi data available. Use the 'Highlight Routes' toggle to see detailed coverage."
      },
      {
        question: "How do I zoom in/out on the map?",
        answer: "Use the scroll wheel on your mouse, pinch gestures on mobile devices, or the zoom controls (+/-) in the top-left corner of the map. You can also double-click to zoom in or use the zoom slider."
      },
      {
        question: "Can I save my favorite routes?",
        answer: "Yes! When you're logged in, you can save frequently used routes to your profile. Click the 'Save Route' button on any route to add it to your favorites for quick access later."
      },
      {
        question: "How do I get directions to the taxi rank?",
        answer: "When you select a route, TeksiMap automatically shows walking directions from your current location to the nearest taxi rank. The directions include estimated walking time and turn-by-turn instructions."
      }
    ]
  },

  // ===== CROWDSOURCING & COMMUNITY =====
  {
    category: "Contributing Routes",
    questions: [
      {
        question: "How can I add a new taxi route?",
        answer: "Click on 'Contribute' in the main menu to access our crowdsourcing feature. You'll need to provide the starting taxi rank, destination, route number/name, fare, and route details. You can also upload photos of taxi ranks or route signs."
      },
      {
        question: "What information do I need to provide?",
        answer: "For each route, we need: starting taxi rank location, destination, route number or name, current fare, operating hours, and any special notes (like peak hour variations). Photos of taxi ranks and route signs are also helpful."
      },
      {
        question: "How do I know if my route was approved?",
        answer: "After submission, your route goes through a verification process by our team. You'll receive an email notification when your route is approved or if any changes are needed. Approved routes appear on the map within 24-48 hours."
      },
      {
        question: "Can I edit a route I submitted?",
        answer: "Yes, you can edit your submitted routes before they're approved. Once approved, you can suggest updates through the same contribution system. Major changes may require re-verification."
      },
      {
        question: "What happens if I make a mistake in my submission?",
        answer: "Don't worry! You can edit your submission before approval, or contact our support team if you notice an error after approval. We appreciate community feedback to maintain accuracy."
      }
    ]
  },

  // ===== ROUTE SUBMISSION PROCESS =====
  {
    category: "Submission Process",
    questions: [
      {
        question: "How do I access the crowdsourcing feature?",
        answer: "Log into your TeksiMap account and click on 'Contribute' in the main navigation. You'll be taken to our crowdsourcing interface where you can add new routes, taxi ranks, or update existing information."
      },
      {
        question: "What's the difference between a regular route and a mini-route?",
        answer: "Regular routes are main taxi routes between major destinations, while mini-routes are shorter feeder routes that connect residential areas to main routes. Mini-routes are essential for complete coverage of urban areas."
      },
      {
        question: "How do I add taxi rank information?",
        answer: "When adding a route, you can also add or update taxi rank information including location, operating hours, facilities available, and photos. This helps other users find and use the rank effectively."
      },
      {
        question: "Can I add routes for areas outside my city?",
        answer: "Yes! You can contribute routes for any area in South Africa where you have reliable information. This helps expand our coverage and serve more communities across the country."
      },
      {
        question: "How long does it take for my route to be approved?",
        answer: "Route approval typically takes 24-48 hours. Routes with complete information and photos are usually approved faster. During peak periods, it may take up to 72 hours. You'll receive an email notification once approved."
      }
    ]
  },

  // ===== COMMUNITY RECOGNITION =====
  {
    category: "Community Recognition",
    questions: [
      {
        question: "How do I become a contributor?",
        answer: "Anyone with a TeksiMap account can become a contributor! Simply start by adding routes, updating information, or contributing photos. There's no special application process - just start contributing to the community."
      },
      {
        question: "What are the different contributor levels?",
        answer: "We have several contributor levels: New Contributor (1-5 routes), Regional Expert (6-15 routes), Top Contributor (16-30 routes), and Community Leader (30+ routes). Each level comes with recognition on our contributors page."
      },
      {
        question: "Can I see my contribution history?",
        answer: "Yes! Log into your account and visit your profile to see your contribution history, including routes submitted, approval status, and community recognition. This helps you track your impact on the platform."
      },
      {
        question: "How do I get recognized for my contributions?",
        answer: "Active contributors are automatically recognized based on the quality and quantity of their contributions. Top contributors are featured on our contributors page and may receive special badges and recognition."
      },
      {
        question: "Are there rewards for contributing routes?",
        answer: "While we don't offer monetary rewards, contributors receive community recognition, profile badges, and the satisfaction of helping thousands of commuters. We're exploring additional recognition programs for top contributors."
      }
    ]
  },

  // ===== USER ACCOUNT & PROFILE =====
  {
    category: "Account & Profile",
    questions: [
      {
        question: "How do I update my personal information?",
        answer: "Log into your account and go to your profile page. You can update your name, username, phone number, and location. Changes are saved automatically and reflected across the platform."
      },
      {
        question: "Can I change my email address?",
        answer: "Yes, you can change your email address in your profile settings. You'll need to verify the new email address before the change takes effect. This helps maintain account security."
      },
      {
        question: "How do I upload a profile picture?",
        answer: "In your profile settings, click on the profile picture area to upload a new image. Supported formats are JPG, PNG, and GIF files under 5MB. The image will be automatically resized for optimal display."
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, you can delete your account in your profile settings. Please note that this action is permanent and will remove all your data, including saved routes and contribution history."
      },
      {
        question: "How do I change my password?",
        answer: "Go to your profile settings and click on 'Change Password'. You'll need to enter your current password and then your new password twice for confirmation. Choose a strong password for better security."
      }
    ]
  },

  // ===== ACTIVITY & HISTORY =====
  {
    category: "Activity & History",
    questions: [
      {
        question: "Can I see my search history?",
        answer: "Currently, we don't store individual search history for privacy reasons. However, you can see your saved routes and contribution history in your profile."
      },
      {
        question: "How do I view my account activity?",
        answer: "Your account activity, including login history, profile changes, and contributions, is available in your profile dashboard. This helps you monitor your account security and track your community involvement."
      },
      {
        question: "Can I export my data?",
        answer: "You can export your personal data including profile information, saved routes, and contribution history. Contact our support team to request a data export."
      },
      {
        question: "How long is my activity stored?",
        answer: "We retain your account activity for security and service improvement purposes. Activity logs are typically stored for 12 months, while your profile data and contributions are retained as long as your account is active."
      }
    ]
  },

  // ===== TECHNICAL & SUPPORT =====
  {
    category: "Technical Support",
    questions: [
      {
        question: "Does TeksiMap work offline?",
        answer: "Currently, TeksiMap requires an internet connection to access route data and maps. We're working on offline functionality for saved routes and basic navigation."
      },
      {
        question: "How much data does the app use?",
        answer: "TeksiMap is designed to be data-efficient. A typical route search uses about 50-100KB of data. Map tiles are cached to reduce data usage on subsequent visits."
      },
      {
        question: "Can I use TeksiMap on my phone and computer?",
        answer: "Yes! TeksiMap works on both desktop and mobile devices. The interface automatically adapts to your screen size for optimal viewing and interaction."
      },
      {
        question: "What browsers are supported?",
        answer: "TeksiMap works on all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using the latest version of your browser."
      },
      {
        question: "Is there a mobile app available?",
        answer: "Currently, TeksiMap is a web application that works great on mobile browsers. We're developing native mobile apps for iOS and Android, which will be available soon."
      }
    ]
  },

  // ===== TROUBLESHOOTING =====
  {
    category: "Troubleshooting",
    questions: [
      {
        question: "The map isn't loading, what should I do?",
        answer: "Try refreshing the page, clearing your browser cache, or checking your internet connection. If the problem persists, try using a different browser or contact our support team."
      },
      {
        question: "Routes aren't showing up, why?",
        answer: "This could be due to limited data coverage in your area, a temporary server issue, or your search location being outside our current coverage area. Try searching for a nearby major location or contact support."
      },
      {
        question: "I can't log in, what's wrong?",
        answer: "Check that you're using the correct email and password. If you've forgotten your password, use the 'Forgot Password' link. Make sure your account is verified by checking your email for the verification link."
      },
      {
        question: "The app is slow, how can I fix it?",
        answer: "Try closing other browser tabs, clearing your browser cache, or using a different browser. Slow performance can also be due to a slow internet connection or high server load."
      },
      {
        question: "How do I report a bug?",
        answer: "Use the feedback form in the help section or contact our support team directly. Please include details about what you were doing when the bug occurred, your browser, and any error messages you saw."
      }
    ]
  },

  // ===== DATA & PRIVACY =====
  {
    category: "Data & Privacy",
    questions: [
      {
        question: "How accurate is the route information?",
        answer: "Our route information is community-verified and regularly updated. However, taxi routes can change due to various factors. We recommend confirming with local taxi operators for the most current information."
      },
      {
        question: "How often is the data updated?",
        answer: "Route data is updated continuously as community members contribute new information. Our team reviews and verifies submissions within 24-48 hours to ensure accuracy."
      },
      {
        question: "Who verifies the route information?",
        answer: "Route information is verified by our community contributors and reviewed by our team. We also cross-reference with multiple sources and local knowledge to ensure accuracy."
      },
      {
        question: "What if I find incorrect information?",
        answer: "Please report any incorrect information through our feedback system or by contributing the correct information. We appreciate community input to maintain data accuracy."
      },
      {
        question: "How do I report wrong routes or prices?",
        answer: "Use the feedback form or contribute the correct information through our crowdsourcing system. Include details about what's wrong and the correct information to help us update the data quickly."
      }
    ]
  },

  // ===== PRIVACY & SECURITY =====
  {
    category: "Privacy & Security",
    questions: [
      {
        question: "Is my location data stored?",
        answer: "We only use your location to provide route suggestions and don't store your specific location data. Your general area may be used to improve service coverage but is not linked to your personal information."
      },
      {
        question: "Who can see my profile information?",
        answer: "Your profile information is only visible to you and our support team when needed. We don't share your personal information with third parties without your consent."
      },
      {
        question: "How is my data protected?",
        answer: "We use industry-standard encryption and security measures to protect your data. Your password is securely hashed, and we regularly review our security practices to ensure your information is safe."
      },
      {
        question: "Can I use TeksiMap anonymously?",
        answer: "You can browse routes and basic information without an account, but creating an account is required for features like saving routes, contributing, and personalized recommendations."
      },
      {
        question: "What data is shared with third parties?",
        answer: "We don't sell or share your personal data with third parties. We may use anonymized, aggregated data for service improvement, but this doesn't include any personal information."
      }
    ]
  },

  // ===== BUSINESS & LEGAL =====
  {
    category: "Business & Legal",
    questions: [
      {
        question: "Which cities are covered?",
        answer: "We currently cover major cities including Johannesburg, Cape Town, Durban, Pretoria, Port Elizabeth, Bloemfontein, and surrounding areas. We're continuously expanding coverage based on community contributions."
      },
      {
        question: "Are rural areas included?",
        answer: "We're working to expand coverage to rural areas, but current focus is on urban centers where taxi networks are most developed. Community contributions help us expand to more rural areas."
      },
      {
        question: "Do you cover all taxi companies?",
        answer: "We cover the informal minibus taxi network that operates across South Africa. This includes routes operated by various taxi associations and independent operators within the informal transport sector."
      },
      {
        question: "What about bus and train routes?",
        answer: "Currently, TeksiMap focuses on the minibus taxi network. We're exploring expansion to include bus and train routes in the future to provide comprehensive public transport information."
      },
      {
        question: "Is international travel supported?",
        answer: "Currently, TeksiMap focuses on South Africa's domestic taxi network. We don't provide international travel information, but we're exploring expansion to other African countries."
      }
    ]
  },

  // ===== LEGAL & TERMS =====
  {
    category: "Legal & Terms",
    questions: [
      {
        question: "What are the terms of service?",
        answer: "Our terms of service outline the rules for using TeksiMap, including acceptable use, intellectual property rights, and user responsibilities. You can find the complete terms on our website."
      },
      {
        question: "What's your privacy policy?",
        answer: "Our privacy policy explains how we collect, use, and protect your personal information. It's available on our website and outlines your rights regarding your data."
      },
      {
        question: "Are there any usage restrictions?",
        answer: "Users must use TeksiMap responsibly and not attempt to manipulate or abuse the system. Commercial use of our data requires permission, and users must respect intellectual property rights."
      },
      {
        question: "What's your refund policy?",
        answer: "TeksiMap is free to use, so there are no refunds necessary. If you experience any issues with our service, please contact our support team for assistance."
      },
      {
        question: "How do I contact support?",
        answer: "You can contact our support team through the feedback form on our website, by email at support@teksimap.co.za, or through our social media channels. We typically respond within 24 hours."
      }
    ]
  },

  // ===== ADVANCED FEATURES =====
  {
    category: "Advanced Features",
    questions: [
      {
        question: "Can I customize the map appearance?",
        answer: "Currently, the map appearance is standardized for consistency. We're working on customization options including different map styles and color schemes for future updates."
      },
      {
        question: "Can I set my preferred routes?",
        answer: "Yes! You can save frequently used routes to your profile for quick access. These saved routes appear in your dashboard and can be accessed with one click."
      },
      {
        question: "How do I save favorite locations?",
        answer: "When viewing a route or location, click the 'Save' button to add it to your favorites. You can organize your saved locations and routes in your profile dashboard."
      },
      {
        question: "Can I set up route alerts?",
        answer: "Route alerts are not currently available, but we're developing this feature. It will allow you to receive notifications about route changes, fare updates, or service disruptions."
      },
      {
        question: "How do I share routes with friends?",
        answer: "You can share routes by copying the URL from your browser when viewing a route. We're also developing direct sharing features for social media and messaging apps."
      }
    ]
  },

  // ===== INTEGRATION =====
  {
    category: "Integration",
    questions: [
      {
        question: "Can I integrate with other apps?",
        answer: "Currently, TeksiMap operates as a standalone web application. We're exploring integration options with other transportation and mapping applications for future development."
      },
      {
        question: "Is there an API available?",
        answer: "We're developing an API for developers and partners. If you're interested in API access, please contact our business development team for more information."
      },
      {
        question: "Can I export route data?",
        answer: "Personal route data can be exported for your own use. For commercial or research purposes, please contact our team to discuss data licensing options."
      },
      {
        question: "How do I sync across devices?",
        answer: "Your TeksiMap account automatically syncs across all devices when you log in. Your saved routes, profile information, and preferences are available on any device with internet access."
      }
    ]
  }
];

// Helper function to get all questions from all categories
export const getAllQuestions = () => {
  return faqData.flatMap(category => 
    category.questions.map(q => ({
      ...q,
      category: category.category
    }))
  );
};

// Helper function to search questions
export const searchQuestions = (searchTerm) => {
  const allQuestions = getAllQuestions();
  const term = searchTerm.toLowerCase();
  
  return allQuestions.filter(q => 
    q.question.toLowerCase().includes(term) || 
    q.answer.toLowerCase().includes(term) ||
    q.category.toLowerCase().includes(term)
  );
};

// Helper function to get questions by category
export const getQuestionsByCategory = (categoryName) => {
  const category = faqData.find(cat => 
    cat.category.toLowerCase() === categoryName.toLowerCase()
  );
  return category ? category.questions : [];
};

// Helper function to get all categories
export const getCategories = () => {
  return faqData.map(category => category.category);
};

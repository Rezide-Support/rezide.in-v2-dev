/*
 * The About page's content, as rezide.in/about shows it (same wording, images and order).
 * Images are the ones rezide.in serves under /about, resized to WebP in /public/images/about.
 * rezide.in's "#" placeholder links point to the matching page here.
 */

const img = (path: string) => `/images/about/${path}.webp`;

export type SolutionCard = {
  images: string[];
  /** Title parts; `accent` parts are shown in rezide.in's blue (#4561ec). */
  title: { text: string; accent?: boolean }[];
  description: string[];
  links: { text: string; href: string; external?: boolean }[];
};

const REGISTER = { text: "Register your account, its free", href: "/signup" };
const REALTOR_CORNER = "/realtor-corner";

export const SOLUTIONS: { id: string; label: string; cards: SolutionCard[] }[] = [
  {
    id: "broker",
    label: "Realtor Solutions",
    cards: [
      {
        images: [1, 2, 3, 4, 5].map((i) => img(`realtor/app-${i}`)),
        title: [{ text: "One App. " }, { text: "Endless possibilities", accent: true }],
        description: [
          "A subscription-based APP with built-in tools to generate leads, automate client interactions and digitize paperwork and operations.",
          "As a real estate realtor, you can see an immediate impact with increased revenue, reduction in costs and improved service efficiency.",
          "Please note that subscription to the realtor App. is through invitation. We reserve the right to offer our subscription services.",
        ],
        links: [
          { text: "Learn more", href: REALTOR_CORNER },
          { text: "Schedule Demo", href: "https://calendly.com/d/cmxn-mq3-vf9/broker-mobile-app?preview_source=et_card&month=2024-12", external: true },
        ],
      },
      {
        images: [1, 2, 3, 4, 5].map((i) => img(`realtor/whatsapp-${i}`)),
        title: [{ text: "Get WhatsApp " }, { text: "Business API", accent: true }],
        description: [
          "Imagine thousands of tele-callers working for you, connecting with prospect data, providing information and qualifying them to generate exclusive customer prospect pool for your business.",
          "This is the power of WhatsApp business API, that allows you to send photo and albums of properties, video tours with built-in conversation journey’s that are AI-powered. without the limitations of group size or fear of being banned.",
          "We can help get a WhatsApp business API account in few days.",
        ],
        links: [
          { text: "Learn more", href: REALTOR_CORNER },
          { text: "Schedule Demo", href: "https://calendly.com/d/cmxx-fgq-d96/whatsapp-business-api?preview_source=et_card&month=2024-12", external: true },
        ],
      },
      {
        images: [1, 2, 3, 4].map((i) => img(`realtor/website-${i}`)),
        title: [{ text: "Get a " }, { text: "Dynamic Website", accent: true }],
        description: [
          "Get a website that will differentiate you from competition.",
          "List unlimited properties with your firm branding through watermark on all listings Photos, Videos, Brochure.",
          "Showcase projects you are actively marketing on your website, without having to enter or upload any details, with your logo watermark on all project collateral.",
          "Your website builds itself just like magic.",
        ],
        // rezide.in's "Schedule Demo" here has no destination, so only "Learn more" is kept.
        links: [{ text: "Learn more", href: REALTOR_CORNER }],
      },
      {
        images: [img("realtor/visiting-card")],
        title: [{ text: "Digital " }, { text: "Visiting Cards", accent: true }],
        description: [
          "Transfer your contact information and take your customer to website profile page or listings, quicker than a handshake.",
          "Did you move your office, or opened another one, added a new member to your team?",
          "Don’t print visiting cards, just update the changes through your Rezide account and your personalized digital card shows the updated information.",
          "You can receive a digital card for every team member at ZERO cost",
        ],
        links: [{ text: "Get in Touch", href: REALTOR_CORNER }],
      },
      {
        images: [img("realtor/billboard")],
        title: [{ text: "Advertise your Services. " }, { text: "Book a Billboard", accent: true }],
        description: [
          "Do you see digital signages of big real estate developers, or property portals? What if you could have your own digital billboard, at a fraction of that cost.",
          "Our Digital Billboard slots are available in specific residential complexes.",
          "If you want to know the cost to advertise through these digital billboards, please connect.",
        ],
        links: [{ text: "Get in Touch", href: REALTOR_CORNER }],
      },
    ],
  },
  {
    id: "seeker",
    label: "Home Seeker Solutions",
    cards: [
      {
        images: [1, 2, 3].map((i) => img(`seeker/seeker-${i}`)),
        title: [
          { text: "Real " }, { text: "Information. ", accent: true },
          { text: "Real " }, { text: "Listings. ", accent: true },
          { text: "Real " }, { text: "Availability.", accent: true },
        ],
        description: [
          "Buyers and Renters are provided access to accurate comparable property information such as recent transactions, project and listing comparison reports for properties that are unique and have 100% availability.",
          "We provide an efficient search and discovery digital experience, enabling home seekers to eliminate and shortlist properties online and only physically visit shortlisted properties to finalize.",
        ],
        links: [REGISTER],
      },
      {
        images: [img("seeker/touch-points")],
        title: [{ text: "Multiple " }, { text: "Touch Points", accent: true }],
        description: [
          "Buyers and Renters can access and interact with real estate information covering localities, developers, projects and property listings through the channel of their convenience.",
          "Home seekers can use their mobile, desktop, WhatsApp chatbot or even interact with lobby kiosks in certain residential complexes.",
          "We have ensured that all their interactions are connected and made available under their account dashboard.",
        ],
        links: [REGISTER],
      },
      {
        images: [img("seeker/visits"), img("seeker/offers")],
        title: [{ text: "Seamless " }, { text: "Digital Journey", accent: true }],
        description: [
          "Buyers and Renters can do more than just search for properties of interest. Our platform allows scheduling property visits, providing visit feedback and making an offer with specifics to the listing broker all on the platform with a few clicks.",
          "This way a home seeker can avoid any miscommunication, and receive status updates by the listing broker through notifications and dashboard updates",
        ],
        links: [REGISTER],
      },
    ],
  },
  {
    id: "owner",
    label: "Home Owner Solutions",
    cards: [
      {
        images: [img("owner/documents")],
        title: [{ text: "Property " }, { text: "Valuation", accent: true }],
        description: [
          "An owner can get an accurate estimate of the property without providing property details.",
          "Select your apartment no. in the building and ask for an estimated rent or sale price. Our platform will do the rest.",
          "We use our comprehensive building data, connect it with real-time market data and use our algorithm to fine tune and provide a calculated value with accuracy.",
          "To know more about our solutions for Sellers / Landlords.",
        ],
        links: [REGISTER],
      },
      {
        images: [img("owner/documents")],
        title: [{ text: "Research your " }, { text: "Realtor", accent: true }],
        description: [
          "As a homeowner, choosing a real estate realtor whom you can trust your property is an important decision.",
          "Whether you're just starting or already have someone in mind, our platform showcases the best of the best, active in your locality / building.",
          "We provide a panel of professional realtors, who use technology to offer automated updates on property showings, instant feedback of property visits along with digitized transaction paperwork.",
        ],
        links: [REGISTER],
      },
      {
        images: [img("owner/documents")],
        title: [{ text: "Digitized " }, { text: "Paperwork", accent: true }],
        description: [
          "Organize property documents like a Pro, our document vault enables maintaining documents (Ownership and Transactional property papers) safe and sorted, for easy access, retrieval and sharing all in one place.",
          "The built-in document generator takes care of LOIs, MOUs, LLAs, AFS, and more, saving hours of tedious typing and formatting. Our pre-built templates ensure accuracy and consistency.",
        ],
        links: [REGISTER],
      },
    ],
  },
];

/**
 * The team, as rezide.in shows them on /about and on each /team/<slug> page. In `role` and `bio`,
 * **double asterisks** mark the words rezide.in sets in bold. `contact` is what rezide.in's
 * "Save Contact" button puts in the downloaded contact card.
 */
export type TeamMember = {
  slug: string;
  name: string;
  image: string;
  width: number;
  height: number;
  /** LinkedIn on the /about card (rezide.in links the same profile with a tracking query there). */
  linkedin: string;
  /** LinkedIn on the member's own page. */
  profileLinkedin: string;
  role: string;
  bio: string[];
  contact: { firstName: string; lastName: string; mobile: string; email: string };
};

export const REZIDE_YOUTUBE = "https://www.youtube.com/@Rezide_in";

export const TEAM: TeamMember[] = [
  {
    slug: "viraj-bhatia",
    name: "Viraj Bhatia",
    image: img("team/viraj-bhatia"),
    width: 640,
    height: 800,
    linkedin: "https://www.linkedin.com/in/viraj-bhatia/",
    profileLinkedin: "https://www.linkedin.com/in/viraj-bhatia/",
    role: "**Co-founder**, driving **Innovation** and **Product Strategy**.",
    bio: [
      "Over 25 years of experience in building Real estate and Stockbroking business.",
      "My learnings in facilitating home buying and renting transactions are that these are **Low frequency, high on emotion**, requiring **advisory services** with hyper **local knowledge and** on-ground **logistics** support. This makes a local **real estate** realtor an **irreplaceable transaction** facilitator.",
      "But much of what the realtor does today can be done more **efficiently** with the use of **accurate data** and **technology tools**, which led me to start Rezide Solutions, a technology-driven ecosystem for residential real estate, that puts the realtor at the centre of every home transaction.",
    ],
    contact: { firstName: "Viraj", lastName: "Bhatia", mobile: "+919967719220", email: "viraj@rezide.in" },
  },
  {
    slug: "rukmani-chalsey",
    name: "Rukmani Chalsey",
    image: img("team/rukmani-chalsey"),
    width: 640,
    height: 426,
    linkedin: "https://in.linkedin.com/in/rukmani-chalsey?trk=org-employees",
    profileLinkedin: "https://in.linkedin.com/in/rukmani-chalsey/",
    role: "**Co-founder**, driving **Sales** and **Marketing Strategy**.",
    bio: [
      "A passionate real estate professional who believes in the power of **AI**, and **automation** having the potential to transform the real estate buying and renting of homes from the present **broken offline** to a **seamless online** experience for homeowners and home seekers, made possible by adoption of an integrated, easy-to-use technology platform by the local real estate realtor.",
      "With an experience of facilitating over 5000+ sale and rental residential transactions, I have gained deep insights into the **ground-level** working of the real estate broking community, having experienced the challenges and resultant **pain points** first hand.",
    ],
    contact: { firstName: "Rukmani", lastName: "Chalsey", mobile: "+918169552370", email: "rukmani@rezide.in" },
  },
  {
    slug: "krishnan-iyer",
    name: "Krishnan Iyer",
    image: img("team/krishnan-iyer"),
    width: 640,
    height: 800,
    linkedin: "",
    profileLinkedin: "",
    role: "**Co-founder**, driving **Finance** and **Operations**.",
    bio: [
      "Nearly **3 decades** of rich experience across the field of Information Technology, Accounts, Finance, Audit, Capital Market, Taxation & Company Law. A **seasoned operational leader** driving digital transformation and streamlining complex processes.",
      "**Process optimization** and **data accuracy** is instrumental in building of the Rezide ecosystem, and by constantly looking to **simplify operations** and **enhance data accuracy**, I ensure that the platform delivers seamless a user experiences with the most reliable information.",
      "Along with **operational excellence**, my responsibility extends into **financial compliance** and **statutory requirements**, overseeing the company's accurate financial reporting and maintaining adherence to **regulatory** requirements.",
    ],
    contact: { firstName: "Krishnan", lastName: "Iyer", mobile: "+919930632910", email: "krishnan@rezide.in" },
  },
];

export const teamMember = (slug: string) => TEAM.find((m) => m.slug === slug);

export const HERO_IMAGE = img("coming-soon");

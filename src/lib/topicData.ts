export interface PregeneratedSearchResult {
    title: string;
    snippet: string;
    url: string;
}

export interface TopicData {
    id: string;
    title: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    forbiddenWords: string[];
    pregeneratedResults: PregeneratedSearchResult[];
}

export const TOPIC_DATABASE: TopicData[] = [
    {
        id: "t_001",
        title: "The Moon Landing",
        category: "History",
        difficulty: "medium",
        forbiddenWords: ["Moon", "Apollo", "Armstrong", "NASA", "Lunar"],
        pregeneratedResults: [
            {
                title: "Apollo 11 - Wikipedia",
                snippet: "The mission that first landed humans on the [REDACTED]. Commander Neil [REDACTED] and pilot Buzz Aldrin formed the American crew that landed the [REDACTED] Module Eagle on July 20, 1969.",
                url: "https://en.wikipedia.org/wiki/Apollo_11"
            },
            {
                title: "July 20, 1969: One Giant Leap For Mankind - NASA",
                snippet: "On July 20, 1969, hundreds of millions of people around the world turned on their televisions to watch two U.S. astronauts do something no one had ever done before.",
                url: "https://www.nasa.gov/mission_pages/apollo/apollo11.html"
            },
            {
                title: "The Space Race: Timeline & Facts",
                snippet: "The competition between two Cold War rivals, the Soviet Union and the United States, to achieve firsts in spaceflight capability.",
                url: "https://www.history.com/topics/cold-war/space-race"
            },
            {
                title: "Saturn V Rocket | National Air and Space Museum",
                snippet: "The Saturn V was a super heavy-lift launch vehicle used by [REDACTED] between 1967 and 1973. It remains the only launch vehicle to carry humans beyond low Earth orbit.",
                url: "https://airandspace.si.edu/explore-and-learn/topics/apollo/saturn-v"
            },
            {
                title: "Tranquility Base - The Eagle Has Landed",
                snippet: "Tranquility Base represents the site on the [REDACTED] where, in 1969, humans first landed and walked on another celestial body.",
                url: "https://www.britannica.com/place/Tranquility-Base"
            }
        ]
    },
    {
        id: "t_002",
        title: "The Great Wall of China",
        category: "History",
        difficulty: "easy",
        forbiddenWords: ["Wall", "China", "Chinese", "Mongol", "Dynasty"],
        pregeneratedResults: [
            {
                title: "The Great [REDACTED] of [REDACTED] - UNESCO World Heritage Centre",
                snippet: "In c. 220 B.C., under Qin Shi Huang, sections of earlier fortifications were joined together to form a united defence system against invasions from the north.",
                url: "https://whc.unesco.org/en/list/438"
            },
            {
                title: "History of the Great [REDACTED]",
                snippet: "The structure was built over centuries by multiple dynasties to protect the Chinese states and empires against the raids and invasions of the various nomadic groups of the Eurasian Steppe.",
                url: "https://www.history.com/topics/ancient-china/great-wall-of-china"
            },
            {
                title: "Length of the Great [REDACTED]",
                snippet: "The total length of all sections ever built is estimated to be 21,196 kilometers (13,171 miles).",
                url: "https://www.chinahighlights.com/greatwall/"
            },
            {
                title: "Visible from Space? Myth vs Reality",
                snippet: "It is a common myth that the structure is visible from the moon with the naked eye. In low Earth orbit, it can be seen under perfect conditions.",
                url: "https://www.nasa.gov/vision/space/workinginspace/great_wall.html"
            },
            {
                title: "Ming Dynasty Fortifications",
                snippet: "The majority of the existing structure dates from the Ming Dynasty (1368–1644). It is the most recognizable symbol of [REDACTED] architecture.",
                url: "https://www.britannica.com/topic/Great-Wall-of-China"
            }
        ]
    },
    {
        id: "t_003",
        title: "Photosynthesis",
        category: "Science",
        difficulty: "medium",
        forbiddenWords: ["Plant", "Sun", "Light", "Green", "Chlorophyll"],
        pregeneratedResults: [
            {
                title: "[REDACTED] - Definition, Process & Equation",
                snippet: "The process by which green organisms and some other organisms use sunlight to synthesize foods from carbon dioxide and water.",
                url: "https://www.britannica.com/science/photosynthesis"
            },
            {
                title: "How Plants Make Food",
                snippet: "Inside the plant cell are small organelles called chloroplasts, which store the energy of [REDACTED]. Within the chloroplast membranes is a light-absorbing pigment.",
                url: "https://www.nationalgeographic.org/encyclopedia/photosynthesis/"
            },
            {
                title: "The Carbon Cycle and Oxygen",
                snippet: "Generally involves the green pigment [REDACTED] and generates oxygen as a byproduct. It is critical for life on Earth.",
                url: "https://www.biologyonline.com/dictionary/photosynthesis"
            },
            {
                title: "Cellular Respiration vs [REDACTED]",
                snippet: "While [REDACTED] requires energy and produces food, cellular respiration breaks down food and releases energy. Plants perform both.",
                url: "https://microbenotes.com/photosynthesis-vs-cellular-respiration/"
            },
            {
                title: "Calvin Cycle",
                snippet: "The set of chemical reactions that take place in chloroplasts during [REDACTED]. The cycle is light-independent because it takes place after the energy has been captured.",
                url: "https://www.khanacademy.org/science/biology/photosynthesis"
            }
        ]
    },
    {
        id: "t_004",
        title: "Mona Lisa",
        category: "Art",
        difficulty: "easy",
        forbiddenWords: ["Painting", "Da Vinci", "Leonardo", "Woman", "Smile"],
        pregeneratedResults: [
            {
                title: "The [REDACTED] - Louvre Museum",
                snippet: "This portrait is believed to be of Lisa Gherardini, wife of Francesco del Giocondo, and is in oil on a white Lombardy poplar panel.",
                url: "https://www.louvre.fr/en/oeuvre-notices/mona-lisa"
            },
            {
                title: "Why is the [REDACTED] so famous?",
                snippet: "It is the best known, the most visited, the most written about, the most sung about, the most parodied work of art in the world.",
                url: "https://www.britannica.com/topic/Mona-Lisa-painting"
            },
            {
                title: "The Mystery of the [REDACTED]",
                snippet: "Her expression, which is frequently described as enigmatic, the monumentality of the composition, the subtle modeling of forms, and the atmospheric illusionism were novel qualities.",
                url: "https://en.wikipedia.org/wiki/Mona_Lisa"
            },
            {
                title: "Leonardo [REDACTED]'s Masterpiece",
                snippet: "Painted between 1503 and 1506 (or possibly as late as 1517), it was acquired by King Francis I of France and is now the property of the French Republic.",
                url: "https://www.leonardodavinci.net/the-mona-lisa.jsp"
            },
            {
                title: "Theft of 1911",
                snippet: "The painting was stolen from the Louvre by Vincenzo Peruggia, an Italian museum worker who wished to return it to Italy.",
                url: "https://www.history.com/news/the-heist-that-made-the-mona-lisa-famous"
            }
        ]
    },
    {
        id: "t_005",
        title: "Bitcoin",
        category: "Technology",
        difficulty: "medium",
        forbiddenWords: ["Crypto", "Currency", "Blockchain", "Satoshi", "Coin"],
        pregeneratedResults: [
            {
                title: "[REDACTED] - Open source P2P money",
                snippet: "[REDACTED] is an innovative payment network and a new kind of money. It uses peer-to-peer technology to operate with no central authority or banks.",
                url: "https://bitcoin.org/"
            },
            {
                title: "What is [REDACTED]?",
                snippet: "A decentralized digital currency, without a central bank or single administrator, that can be sent from user to user on the peer-to-peer network without the need for intermediaries.",
                url: "https://www.investopedia.com/terms/b/bitcoin.asp"
            },
            {
                title: "History of [REDACTED]",
                snippet: "The domain name was registered on 18 August 2008. On 31 October 2008, a link to a paper authored by [REDACTED] Nakamoto was posted to a cryptography mailing list.",
                url: "https://en.wikipedia.org/wiki/History_of_bitcoin"
            },
            {
                title: "[REDACTED] Mining Explained",
                snippet: "The process by which new [REDACTED] are entered into circulation. It is also the way the network confirms new transactions and is a critical component of the [REDACTED] ledger's maintenance.",
                url: "https://www.coindesk.com/learn/what-is-bitcoin-mining/"
            },
            {
                title: "Cryptocurrency Market",
                snippet: "As the first and most valuable cryptocurrency, [REDACTED] is often referred to as digital gold.",
                url: "https://coinmarketcap.com/currencies/bitcoin/"
            }
        ]
    }
];

export const getRandomTopics = (count: number = 4): TopicData[] => {
    const shuffled = [...TOPIC_DATABASE].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

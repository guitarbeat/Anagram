// Special dictionary categories for intelligent humorous phrasing

export const COMMON_SHORT = new Set(
  'a i am an as at be by do go he if in is it me my no of oh on or so to up us we'.split(' ')
);

export const COMMON_3 = new Set(
  'the and you are was not but all can her one our out day get has him his how man new now old see two way who boy car dad did die end for fun god got had hey job kid let lot may mom own put run saw say son too use war yes art bed big bit box cat cup dog ear eat egg eye fat fit fly gun hit hot ice jam jar jaw key leg lip log map mud net nut ore pan pen pet pie pig pin pot rag rat red rib rim rip rod row rub rug run rye sap sea sew sky sod son sow spy sun tap tea ten tie tin tip toe top toy tub van vet war wax way web wet win wit yak yes yum zap zoo'.split(' ')
);

export const ARTICLES = new Set(
  'a an the this that these those my your our his her its their no some any each every all another'.split(' ')
);

export const PRONOUNS = new Set(
  'i you he she it we they me him her us them who whom what which whose myself yourself himself herself itself ourselves yourselves themselves'.split(' ')
);

export const PREPS = new Set(
  'in on at of to from with for by over under into near around without behind before after off out away through between among against upon across towards within below along past'.split(' ')
);

export const CONJS = new Set('and or but so yet nor for though although because while since unless'.split(' '));

export const AUX = new Set(
  'do does did have has had can could will would shall should may might must am is are was were be been being'.split(' ')
);

export const VERBS = new Set(
  `is are was were be been being have has had do does did say says said go goes went gone get gets got gotten
  make makes made know knows knew known think thinks thought take takes took taken see sees saw seen come comes came
  want wants wanted look looks looked use uses used find finds found give gives gave given tell tells told ask asks asked
  work works worked seem seems seemed feel feels felt try tries tried leave leaves left call calls called own owns owned
  love loves loved hate hates hated eat eats ate eaten need needs needed run runs ran walk walks walked win wins won
  lose loses lost owe owes owed wear wears wore worn swoon swoons swooned zap zaps zapped cook cooks cooked dance dances danced
  sing sings sang sung play plays played read reads sleep sleeps slept drink drinks drank drunk bite bites bit bitten
  bake bakes baked burn burns burned catch catches caught fight fights fought fly flies flew flown hide hides hid hidden
  hold holds held ride rides rode ridden save saves saved strike strikes struck swim swims swam swum taste tastes tasted
  teach teaches taught throw throws threw thrown wake wakes woke woken wish wishes wished zap zaps zapped roam roams roamed
  tame tames tamed pet pets petted feed feeds fed breed breeds bred hunt hunts hunted steer steers steered pack packs packed`.split(/\s+/)
);

export const SPICY = new Set(
  'fuck fucking fucked fucker fuckin shit shitty bitch bastards bastard ass asshole assholes dick dicks pussy cunt cock cocks boob boobs tits tit pissed wank wanker dammit damn'.split(' ')
);

export const FUNNY_WORDS = new Set(
  `zoolander zorro noodle noodles pickle pickles banana bananas clown clowns wizard wizards goblin goblins zombie zombies
  butt butts fart farts poop poops chicken chickens duck ducks goose geese potato potatoes taco tacos burrito burritos
  sausage sausages salami monkey monkeys donkey donkeys raccoon raccoons ferret ferrets swoon swooned saloon razor roo
  bozo bozos dork dorks nerd nerds alien aliens robot robots pirate pirates cowboy cowboys unicorn unicorns dragon dragons
  waffle waffles pancake pancakes donut donuts pizza pizzas cheese hamster hamsters llama llamas sloth sloths spoon spoons
  moon moons laser lasers disco chaos weird silly goofy absurd bizarre muffin muffins ninja ninjas squirrel squirrels
  penguin penguins marshmallow marshmallows nachos guacamole bagel bagels pretzel pretzels cupcake cupcakes popcorn
  mustache beard wig wobbly giggly quirky kangaroo koala chimpanzee baboon aardvark wombat platypus mongoose hedgehog
  flamingo ostrich walrus yak skunk badger otter gopher beaver porcupine vulture pelican toucan parrot octopus squid
  lobster crab jellyfish piranha anaconda cobra viper tarantula mosquito cockroach beetle cricket caterpillar bumblebee
  wasp hornet grasshopper snail slug toad tadpole gecko chameleon iguana dinosaur mammoth yeti bigfoot werewolf vampire
  cyborg android gremlin leprechaun gargoyle genie banshee mermaid centaur minotaur pegasus phoenix hydra chimera kraken
  leviathan gargantuan colossal microscopic atomic quantum cosmic galactic sonic supersonic supersonic turbo supersonic
  bamboozle flabbergast shenanigans kerfuffle hullabaloo brouhaha hogwash poppycock balderdash tomfoolery rigmarole
  hocus pocus abracadabra presto voila bingo eureka yahoo yippee whoopee bazinga kapow kaboom wham zap bonk boing swoosh
  tickle chuckle giggle snicker guffaw smirk grin chortle cackle howl roar bellow squeak squawk chirp purr buzz hum honk
  quack oink moo baa neigh bray cluck gobble hoot ribbit caw meow bark woof yelp yip growl snarl hiss puff pant gasp wheeze
  snort drool belch burp hiccup yawn sneeze sneeze sneeze cough spit slurp crunch munch chew chomp nibble gulp sip gobble
  lick savor snack feast binge banquet buffet picnic diner cafe tavern pub saloon cantina bistro bakery pizzeria brewery
  espresso cappuccino latte mocha frappe smoothie milkshake soda cola cider whiskey bourbon scotch brandy rum vodka tequila
  gin champagne martini cocktail margarita punch smoothie potion brew elixir tonic syrup gravy butter cream custard pudding
  jello mousse yogurt fondant marzipan meringue frosting caramel fudge taffy candy lollipop truffle chocolate marshmallow
  cookie biscuit brownie cake pastry tart pie cobbler crumble donut waffle pancake crepe bagel muffin scone croissant
  baguette pretzel tortilla pita naan taco burrito quesadilla enchilada fajita tamale paella lasagna ravioli spaghetti
  macaroni gnocchi risotto polenta sushi sashimi ramen udon soba tempura gyoza kimchi curry tandoori kebab falafel shawarma
  schnitzel bratwurst frankfurter hotdog hamburger cheeseburger slider meatball pepperoni bacon pastrami brisket ribs steak
  bacon sausage ham spam bologna salami prosciutto pancetta chorizo pepperoni cheddar mozzarella parmesan gouda brie feta
  ricotta provolone swiss gorgonzola roquefort camembert havarti gruyere muenster manchego queso fondue nacho salsa guacamole`.split(/\s+/)
);

export const SCRABBLE_POINTS: Record<string, number> = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
  n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
};

export const NOIR_WORDS = new Set(
  `detective shadow shadows rain trenchcoat smoke alley revolver bullet crime case dame suspect alibi murder victim noir neon motel bar whiskey neon midnight secret lie lies truth blood clue clues dark sinister badge corrupt fedora cigar`.split(/\s+/)
);

export const FANTASY_WORDS = new Set(
  `wizard wizardry goblin goblins dragon dragons spell spells wand staff castle sword dagger shield knight potion magic arcane elf elves dwarf dwarves orc orcs dungeon quest potion sorcerer necromancer curse crown throne relic rune runes beast griffin`.split(/\s+/)
);

export const CYBER_WORDS = new Set(
  `cyber cyborg hacker hack hacks glitch matrix robot robots android laser lasers quantum node nodes server code binary protocol cipher chip virus daemon data sync proxy signal mainframe circuit drone flux terminal neon`.split(/\s+/)
);

export const FAMOUS_ANAGRAMS = [
  {
    source: 'Aaron Lorenzo Woods',
    target: 'Zoolander owns a roo.',
    category: 'Celebrity' as const,
    commentary: 'The classic hilarious anagram that turns a distinguished name into an Australian outback adventure!'
  },
  {
    source: 'Tom Marvolo Riddle',
    target: 'I am Lord Voldemort',
    category: 'Movies & Pop Culture' as const,
    commentary: 'The famous Harry Potter revelation from Chamber of Secrets where Voldemort reveals his origin name.'
  },
  {
    source: 'Clint Eastwood',
    target: 'Old West Action',
    category: 'Celebrity' as const,
    commentary: 'Incredibly fitting anagram for the legendary spaghetti western star.'
  },
  {
    source: 'The Eyes',
    target: 'They See',
    category: 'Mindblowing' as const,
    commentary: 'Poetic, minimal, and perfectly descriptive.'
  },
  {
    source: 'Eleven plus two',
    target: 'Twelve plus one',
    category: 'Mindblowing' as const,
    commentary: 'Both phrases have identical letters and evaluate to the exact same math equation (13 = 13).'
  },
  {
    source: 'The Morse Code',
    target: 'Here Come Dots',
    category: 'Mindblowing' as const,
    commentary: 'Explains the actual mechanism of telegraph dots and dashes!'
  },
  {
    source: 'Dormitory',
    target: 'Dirty Room',
    category: 'Hilarious' as const,
    commentary: 'Every college student knows how accurate this exact anagram is.'
  },
  {
    source: 'The Cockroach',
    target: 'Cook that crab',
    category: 'Hilarious' as const,
    commentary: 'A bizarre culinary instruction hidden in household pests.'
  },
  {
    source: 'Justin Timberlake',
    target: 'I am a jerk but listen',
    category: 'Celebrity' as const,
    commentary: 'A humorous alternate pop single title.'
  },
  {
    source: 'Listen',
    target: 'Silent',
    category: 'Classic & Literary' as const,
    commentary: 'One of the oldest and most profound one-word anagrams in the English language.'
  },
  {
    source: 'Astronomer',
    target: 'Moon starer',
    category: 'Classic & Literary' as const,
    commentary: 'A wonderfully literal description of stargazers.'
  },
  {
    source: 'Mother-in-law',
    target: 'Woman Hitler',
    category: 'Hilarious' as const,
    commentary: 'A legendary dark humor punchline passed around anagram circles for decades.'
  },
  {
    source: 'Slot Machines',
    target: 'Cash Lost in Me',
    category: 'Hilarious' as const,
    commentary: 'The casino truth revealed.'
  },
  {
    source: 'Schoolmaster',
    target: 'The Classroom',
    category: 'Classic & Literary' as const,
    commentary: 'A perfect 13-letter anagram pairing the teacher with their natural habitat.'
  },
  {
    source: 'Statue of Liberty',
    target: 'Built to stay free',
    category: 'Mindblowing' as const,
    commentary: 'An inspiring patriotic anagram honoring Lady Liberty.'
  }
];

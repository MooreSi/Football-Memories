/** Who a team name in a Hudl title or match record really is (owner request 2026-11-13).
 *  Titles use short forms ("Man City"), nicknames ("The Hammers", "Bluebirds") and
 *  cut-off names ("Shrewsbury Tow"); the crest lookup needs the full club name. */

// Full names, as their Wikipedia "<name> F.C." page is titled. A cut-off name is
// matched against these by prefix.
const FULL = [
  "AFC Bournemouth", "Arsenal", "Aston Villa", "Barnsley", "Birmingham City", "Blackburn Rovers",
  "Bolton Wanderers", "Bradford City", "Brentford", "Brighton & Hove Albion", "Bristol City",
  "Bristol Rovers", "Burnley", "Cambridge United", "Cardiff City", "Charlton Athletic", "Chelsea",
  "Coventry City", "Crewe Alexandra", "Crystal Palace", "Derby County", "Everton", "Exeter City",
  "Fulham", "Huddersfield Town", "Hull City", "Ipswich Town", "Leeds United", "Leicester City",
  "Liverpool", "Luton Town", "Manchester City", "Manchester United", "Middlesbrough", "Millwall",
  "Milton Keynes Dons", "Newcastle United", "Norwich City", "Nottingham Forest", "Notts County",
  "Oxford United", "Peterborough United", "Plymouth Argyle", "Port Vale", "Portsmouth",
  "Preston North End", "Queens Park Rangers", "Reading", "Rotherham United", "Sheffield United",
  "Sheffield Wednesday", "Shrewsbury Town", "Southampton", "Stoke City", "Sunderland",
  "Swansea City", "Tottenham Hotspur", "Walsall", "Watford", "West Bromwich Albion",
  "West Ham United", "Wigan Athletic", "Wolverhampton Wanderers", "Wrexham",
  "Accrington Stanley", "AFC Wimbledon", "Barrow", "Blackpool", "Bromley", "Burton Albion",
  "Carlisle United", "Cheltenham Town", "Colchester United", "Crawley Town", "Doncaster Rovers",
  "Fleetwood Town", "Forest Green Rovers", "Gillingham", "Grimsby Town", "Harrogate Town",
  "Leyton Orient", "Lincoln City", "Mansfield Town", "Morecambe", "Northampton Town",
  "Oldham Athletic", "Rochdale", "Salford City", "Southend United", "Stevenage", "Stockport County",
  "Sutton United", "Swindon Town", "Tranmere Rovers", "Wycombe Wanderers", "Aberdeen", "Celtic",
  "Dundee United", "Heart of Midlothian", "Hibernian", "Kilmarnock", "Motherwell", "Rangers",
  "St Mirren",
];

// Short forms and nicknames, lower case, without a leading "the".
const ALIASES: Record<string, string> = {
  villa: "Aston Villa", villans: "Aston Villa",
  gunners: "Arsenal",
  bournemouth: "AFC Bournemouth", cherries: "AFC Bournemouth",
  barnsley: "Barnsley", tykes: "Barnsley",
  birmingham: "Birmingham City",
  blackburn: "Blackburn Rovers",
  bolton: "Bolton Wanderers", trotters: "Bolton Wanderers",
  bradford: "Bradford City", bantams: "Bradford City",
  bees: "Brentford",
  brighton: "Brighton & Hove Albion", seagulls: "Brighton & Hove Albion",
  robins: "Bristol City",
  clarets: "Burnley",
  cambridge: "Cambridge United",
  cardiff: "Cardiff City", bluebirds: "Cardiff City",
  charlton: "Charlton Athletic", addicks: "Charlton Athletic",
  coventry: "Coventry City", "sky blues": "Coventry City",
  crewe: "Crewe Alexandra",
  palace: "Crystal Palace", eagles: "Crystal Palace",
  derby: "Derby County", rams: "Derby County",
  toffees: "Everton",
  exeter: "Exeter City", grecians: "Exeter City",
  cottagers: "Fulham",
  huddersfield: "Huddersfield Town", terriers: "Huddersfield Town",
  hull: "Hull City", tigers: "Hull City",
  ipswich: "Ipswich Town", "tractor boys": "Ipswich Town",
  leeds: "Leeds United",
  leicester: "Leicester City", foxes: "Leicester City",
  luton: "Luton Town", hatters: "Luton Town",
  "man city": "Manchester City", "manchester c": "Manchester City", citizens: "Manchester City", cityzens: "Manchester City",
  "man utd": "Manchester United", "man united": "Manchester United", "man u": "Manchester United",
  "manchester utd": "Manchester United", "red devils": "Manchester United",
  boro: "Middlesbrough",
  "mk dons": "Milton Keynes Dons",
  newcastle: "Newcastle United", magpies: "Newcastle United", toon: "Newcastle United",
  norwich: "Norwich City", canaries: "Norwich City",
  forest: "Nottingham Forest", "nottm forest": "Nottingham Forest", "notts forest": "Nottingham Forest",
  notts: "Notts County",
  oxford: "Oxford United",
  peterborough: "Peterborough United", posh: "Peterborough United",
  plymouth: "Plymouth Argyle", argyle: "Plymouth Argyle", pilgrims: "Plymouth Argyle",
  vale: "Port Vale",
  pompey: "Portsmouth",
  preston: "Preston North End",
  qpr: "Queens Park Rangers", hoops: "Queens Park Rangers",
  royals: "Reading",
  rotherham: "Rotherham United", millers: "Rotherham United",
  "sheff utd": "Sheffield United", "sheffield utd": "Sheffield United", blades: "Sheffield United",
  "sheff wed": "Sheffield Wednesday", "sheffield wed": "Sheffield Wednesday", owls: "Sheffield Wednesday",
  shrewsbury: "Shrewsbury Town", shrews: "Shrewsbury Town",
  saints: "Southampton",
  stoke: "Stoke City", potters: "Stoke City",
  "black cats": "Sunderland",
  swansea: "Swansea City", swans: "Swansea City",
  spurs: "Tottenham Hotspur", tottenham: "Tottenham Hotspur",
  saddlers: "Walsall",
  hornets: "Watford",
  "west brom": "West Bromwich Albion", wba: "West Bromwich Albion", baggies: "West Bromwich Albion",
  "west ham": "West Ham United", hammers: "West Ham United", irons: "West Ham United",
  wigan: "Wigan Athletic",
  wolves: "Wolverhampton Wanderers", wolverhampton: "Wolverhampton Wanderers",
  accrington: "Accrington Stanley", wimbledon: "AFC Wimbledon",
  burton: "Burton Albion", carlisle: "Carlisle United", cheltenham: "Cheltenham Town",
  colchester: "Colchester United", crawley: "Crawley Town", doncaster: "Doncaster Rovers",
  fleetwood: "Fleetwood Town", "forest green": "Forest Green Rovers", grimsby: "Grimsby Town",
  mariners: "Grimsby Town", harrogate: "Harrogate Town", orient: "Leyton Orient", lincoln: "Lincoln City",
  imps: "Lincoln City", mansfield: "Mansfield Town", stags: "Mansfield Town", northampton: "Northampton Town",
  cobblers: "Northampton Town", oldham: "Oldham Athletic", salford: "Salford City",
  southend: "Southend United", stockport: "Stockport County", sutton: "Sutton United",
  swindon: "Swindon Town", tranmere: "Tranmere Rovers", wycombe: "Wycombe Wanderers",
  chairboys: "Wycombe Wanderers", hearts: "Heart of Midlothian", hibs: "Hibernian",
  barca: "Barcelona", "fc barcelona": "Barcelona",
  juve: "Juventus",
  killie: "Kilmarnock",
};

/** "Stoke City FC U11" -> "stoke city": drops age groups, "FC", brackets and "the". */
export function clubKey(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:u\s*\d{1,2}s?(?:\/u?\d{1,2}s?)?|under[ -]?\d{1,2}|a?\.?f\.?c\.?)(?=\s|$)/gi, " ")
    .replace(/^\s*the\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** The full club name, or the name tidied but as written when the club is unknown. */
export function resolveClub(name: string): string {
  const k = clubKey(name);
  if (!k) return name.trim();
  if (ALIASES[k]) return ALIASES[k];
  const full = FULL.find((club) => club.toLowerCase() === k);
  if (full) return full;
  // A cut-off name ("Shrewsbury Tow"): only when it is long enough to be one club.
  if (k.length >= 8) {
    const prefixed = FULL.filter((club) => club.toLowerCase().startsWith(k));
    if (prefixed.length === 1) return prefixed[0];
  }
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

/** True when two names are the same club ("Aston Villa U10" and "Villa"). */
export function sameClub(a: string, b: string): boolean {
  return clubKey(resolveClub(a)) === clubKey(resolveClub(b));
}

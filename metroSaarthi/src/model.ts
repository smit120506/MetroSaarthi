export type Category = "Safety" | "Cleanliness" | "Fare" | "Lifts & Escalators" | "Staff Behaviour" | "Needs Review"
export type Priority = "Critical" | "High" | "Medium" | "Low"
export type Status = "New" | "Triaged" | "Assigned" | "In Progress" | "Resolved"
export type Language = "English" | "Hindi" | "Gujarati" | "Gujlish"
export type SyncStatus = "pending" | "syncing" | "synced" | "failed"

export interface Complaint {
  id: string
  complaintText: string
  language: Language
  station: string
  locationDetail?: string
  category: Category
  classificationReason: string
  matchedTerms: string[]
  classificationConfidence: number
  safetySeverity: number
  passengerImpact: number
  operationalDisruption: number
  timeSensitivity: number
  priorityScore: number
  priorityLevel: Priority
  assignedDepartment: Category
  assignedTeam: string
  status: Status
  responseDraft: string
  responseReviewed: boolean
  internalNotes: string
  relatedIncidentId: string
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
  source: "passenger" | "operator"
  passengerSession?: string
  attachmentName?: string
  attachmentData?: string
}

export interface Incident {
  id: string
  title: string
  complaintIds: string[]
  createdAt: string
}

const rules: Record<Exclude<Category, "Needs Review">, string[]> = {
  Safety: [
    "smoke",
    "fire",
    "sparks",
    "danger",
    "emergency",
    "fell",
    "injury",
    "dhumado",
    "aag",
    "आग",
    "धुआं",
    "धुआँ",
    "સળગ",
    "ધુમાડ",
  ],
  Cleanliness: [
    "dirty",
    "garbage",
    "waste",
    "smell",
    "toilet",
    "kachra",
    "ganda",
    "गंदा",
    "कचरा",
    "સફાઈ",
    "કચરો",
    "ગંદ",
  ],
  Fare: [
    "fare",
    "ticket",
    "charged",
    "deducted",
    "refund",
    "card",
    "paisa",
    "kiraya",
    "किराया",
    "पैसे",
    "ભાડું",
    "પૈસા",
    "ટિકિટ",
  ],
  "Lifts & Escalators": [
    "lift",
    "elevator",
    "escalator",
    "bandh",
    "stuck",
    "not working",
    "बंद",
    "लिफ्ट",
    "एस्केलेटर",
    "બંધ",
    "લિફ્ટ",
    "એસ્કેલેટર",
  ],
  "Staff Behaviour": [
    "staff",
    "rude",
    "behaviour",
    "misbehav",
    "guard",
    "rudely",
    "बदतमीज़",
    "स्टाफ",
    "व्यवहार",
    "સ્ટાફ",
    "વર્તન",
  ],
}

export function normalizeText(text: string) {
  return text
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function detectLanguage(text: string): Language {
  if (/[\u0A80-\u0AFF]/.test(text)) return "Gujarati"
  if (/[\u0900-\u097F]/.test(text)) return "Hindi"
  const mixed = [
    "che",
    "bandh",
    "bahut",
    "hai",
    "par",
    "paisa",
    "nathi",
    "karo",
  ].filter((w) => normalizeText(text).split(" ").includes(w))
  return mixed.length ? "Gujlish" : "English"
}

export function classify(text: string) {
  const normalized = normalizeText(text)
  const scores = Object.entries(rules)
    .map(([category, terms]) => ({
      category: category as Category,
      matches: terms.filter((term) => normalized.includes(term)),
    }))
    .sort((a, b) => b.matches.length - a.matches.length)
  const winner = scores[0]
  if (!winner?.matches.length) {
    return {
      category: "Needs Review" as Category,
      matchedTerms: [],
      confidence: 0,
      reason:
        "No configured local rule matched. Human classification is required.",
    }
  }
  const tied = scores[1]?.matches.length === winner.matches.length
  const confidence = tied ? 45 : Math.min(95, 55 + winner.matches.length * 15)
  return {
    category: winner.category,
    matchedTerms: winner.matches,
    confidence,
    reason: `Matched ${winner.matches.length} local ${winner.category.toLowerCase()} rule${
      winner.matches.length > 1 ? "s" : ""
    }: ${winner.matches.join(", ")}.${
      tied ? " Another category also matched; review recommended." : ""
    }`,
  }
}

export function scoreComplaint(text: string, category: Category) {
  const n = normalizeText(text)
  const severe = [
    "smoke",
    "fire",
    "aag",
    "dhumado",
    "sparks",
    "injury",
    "stuck",
    "धुआ",
    "आग",
    "ધુમાડ",
  ].some((w) => n.includes(w))
  const platform = [
    "platform",
    "crowd",
    "passenger",
    "coach",
    "પ્લેટફોર્મ",
    "प्लेटफॉर्म",
  ].some((w) => n.includes(w))
  const blocked = ["not working", "bandh", "stuck", "blocked", "બંધ", "बंद"].some(
    (w) => n.includes(w),
  )
  const urgent = [
    "now",
    "immediate",
    "urgent",
    "currently",
    "તાત્કાલિક",
    "तुरंत",
  ].some((w) => n.includes(w))
  const safetySeverity = severe
    ? 40
    : category === "Safety"
      ? 24
      : category === "Lifts & Escalators"
        ? 10
        : 4
  const passengerImpact = platform
    ? 23
    : category === "Cleanliness" || category === "Fare"
      ? 12
      : 15
  const operationalDisruption = blocked
    ? 18
    : category === "Safety"
      ? 15
      : category === "Fare"
        ? 7
        : 10
  const timeSensitivity = severe
    ? 15
    : urgent
      ? 13
      : category === "Safety"
        ? 10
        : 6
  const total = Math.min(
    100,
    safetySeverity + passengerImpact + operationalDisruption + timeSensitivity,
  )
  const priorityLevel: Priority =
    total >= 80
      ? "Critical"
      : total >= 60
        ? "High"
        : total >= 30
          ? "Medium"
          : "Low"
  return {
    safetySeverity,
    passengerImpact,
    operationalDisruption,
    timeSensitivity,
    priorityScore: total,
    priorityLevel,
    explanation: severe
      ? "An explicit smoke, fire, injury, or entrapment term triggered the safety override."
      : `Rule factors indicate ${priorityLevel.toLowerCase()} urgency based on severity, impact, disruption, and time sensitivity.`,
    action:
      total >= 80
        ? "Verify immediately and escalate to station safety control."
        : total >= 60
          ? "Review and assign within 10 minutes."
          : total >= 30
            ? "Assign to the responsible queue for timely follow-up."
            : "Handle in the routine service queue.",
  }
}

export function makeComplaint(
  text: string,
  station: string,
  extras: Partial<Complaint> = {},
): Complaint {
  const c = classify(text)
  const s = scoreComplaint(text, c.category)
  const now = new Date().toISOString()
  return {
    id: `MS-${Date.now().toString().slice(-7)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    complaintText: text,
    language: detectLanguage(text),
    station,
    category: c.category,
    classificationReason: c.reason,
    matchedTerms: c.matchedTerms,
    classificationConfidence: c.confidence,
    ...s,
    assignedDepartment: c.category,
    assignedTeam: "",
    status: "New",
    responseDraft: "",
    responseReviewed: false,
    internalNotes: "",
    relatedIncidentId: "",
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    source: "operator",
    ...extras,
  }
}

const samples: Array<[string, string, Partial<Complaint>]> = [
  [
    "Smoke visible near platform 2 electrical cabinet",
    "Vastral Gam",
    {
      status: "New",
      assignedTeam: "Station Safety",
      createdAt: "2025-02-16T09:12:00.000Z",
    },
  ],
  [
    "Platform par dhumado che, please check immediately",
    "Apparel Park",
    { status: "Triaged", createdAt: "2025-02-16T09:17:00.000Z" },
  ],
  [
    "Platform bahut dirty hai aur kachra pada hai",
    "Old High Court",
    {
      status: "Assigned",
      assignedTeam: "Housekeeping",
      createdAt: "2025-02-16T08:35:00.000Z",
    },
  ],
  [
    "Wrong fare deducted from my metro card",
    "Thaltej",
    {
      status: "In Progress",
      assignedTeam: "Revenue Desk",
      createdAt: "2025-02-16T08:02:00.000Z",
    },
  ],
  [
    "Lift bandh che at entry gate",
    "Kalupur",
    { status: "New", createdAt: "2025-02-16T07:49:00.000Z" },
  ],
  [
    "Staff spoke rudely when I asked for directions",
    "Shahpur",
    { status: "Triaged", createdAt: "2025-02-16T07:22:00.000Z" },
  ],
  [
    "ટિકિટના પૈસા બે વાર કપાયા",
    "Vastral Gam",
    {
      status: "Assigned",
      assignedTeam: "Revenue Desk",
      createdAt: "2025-02-15T18:40:00.000Z",
    },
  ],
  [
    "लिफ्ट बंद है और बुज़ुर्ग यात्री इंतज़ार कर रहे हैं",
    "Kalupur",
    {
      status: "In Progress",
      assignedTeam: "Engineering",
      createdAt: "2025-02-15T18:20:00.000Z",
    },
  ],
  [
    "કચરો પ્લેટફોર્મ પાસે પડ્યો છે",
    "Gheekanta",
    {
      status: "Resolved",
      assignedTeam: "Housekeeping",
      createdAt: "2025-02-15T17:48:00.000Z",
    },
  ],
  [
    "Escalator stopped suddenly while passengers were on it",
    "Old High Court",
    { status: "New", createdAt: "2025-02-15T17:31:00.000Z" },
  ],
  [
    "Guard ka behaviour theek nahi tha",
    "Apparel Park",
    {
      status: "Resolved",
      assignedTeam: "Customer Care",
      createdAt: "2025-02-15T16:12:00.000Z",
    },
  ],
  [
    "Strong burning smell near platform 2",
    "Vastral Gam",
    {
      status: "Assigned",
      assignedTeam: "Station Safety",
      createdAt: "2025-02-15T15:51:00.000Z",
    },
  ],
  [
    "Washroom is dirty and has no water",
    "Thaltej",
    {
      status: "In Progress",
      assignedTeam: "Housekeeping",
      createdAt: "2025-02-15T14:14:00.000Z",
    },
  ],
  [
    "Fare shown on gate does not match ticket",
    "Shahpur",
    { status: "Triaged", createdAt: "2025-02-15T13:46:00.000Z" },
  ],
  [
    "એસ્કેલેટર બંધ છે",
    "Gheekanta",
    {
      status: "Resolved",
      assignedTeam: "Engineering",
      createdAt: "2025-02-15T12:29:00.000Z",
    },
  ],
  [
    "स्टाफ ने मेरी बात नहीं सुनी और गलत व्यवहार किया",
    "Kalupur",
    {
      status: "Assigned",
      assignedTeam: "Customer Care",
      createdAt: "2025-02-15T11:09:00.000Z",
    },
  ],
  [
    "Water spilled near platform edge, passengers may fall",
    "Apparel Park",
    { status: "New", createdAt: "2025-02-15T10:53:00.000Z" },
  ],
  [
    "Card refund abhi tak nahi mila",
    "Old High Court",
    {
      status: "In Progress",
      assignedTeam: "Revenue Desk",
      createdAt: "2025-02-15T09:30:00.000Z",
    },
  ],
  [
    "Dustbin full che, smell ave che",
    "Vastral Gam",
    {
      status: "Resolved",
      assignedTeam: "Housekeeping",
      createdAt: "2025-02-15T08:15:00.000Z",
    },
  ],
  [
    "Lift doors are stuck halfway at concourse",
    "Thaltej",
    {
      status: "Assigned",
      assignedTeam: "Engineering",
      createdAt: "2025-02-14T19:05:00.000Z",
    },
  ],
  [
    "A passenger fell near the escalator and needs help",
    "Shahpur",
    {
      status: "Resolved",
      assignedTeam: "Station Safety",
      createdAt: "2025-02-14T18:44:00.000Z",
    },
  ],
]

export function seedComplaints() {
  return samples.map(([text, station, extras], i) =>
    makeComplaint(text, station, {
      id: `MS-DEMO-${String(i + 1).padStart(3, "0")}`,
      syncStatus: i < 15 ? "synced" : "pending",
      ...extras,
      updatedAt: extras.createdAt || new Date().toISOString(),
      source: i < 5 ? "passenger" : "operator",
      passengerSession: i < 5 ? "demo-device" : undefined,
    }),
  )
}

export const replyTemplates: Record<Exclude<Category, "Needs Review">, Record<"English" | "Hindi" | "Gujarati", string>> =
  {
    Safety: {
      English:
        "Thank you for reporting this safety concern. Station staff have been asked to review the location. Please keep a safe distance and follow staff instructions.",
      Hindi:
        "इस सुरक्षा संबंधी सूचना के लिए धन्यवाद। स्टेशन कर्मचारियों से स्थान की जाँच करने को कहा गया है। कृपया सुरक्षित दूरी बनाए रखें और कर्मचारियों के निर्देशों का पालन करें।",
      Gujarati:
        "સુરક્ષા સંબંધિત જાણ કરવા બદલ આભાર. સ્ટેશન સ્ટાફને સ્થળ તપાસવા જણાવવામાં આવ્યું છે. કૃપા કરીને સુરક્ષિત અંતર રાખો અને સ્ટાફની સૂચનાઓ અનુસરો.",
    },
    Cleanliness: {
      English:
        "Thank you for reporting the cleanliness issue. The details have been recorded for the station housekeeping team to review.",
      Hindi:
        "स्वच्छता संबंधी समस्या की सूचना देने के लिए धन्यवाद। स्टेशन हाउसकीपिंग टीम की समीक्षा के लिए विवरण दर्ज कर लिया गया है।",
      Gujarati:
        "સફાઈની સમસ્યા જણાવવા બદલ આભાર. સ્ટેશન હાઉસકીપિંગ ટીમની સમીક્ષા માટે વિગતો નોંધવામાં આવી છે.",
    },
    Fare: {
      English:
        "Thank you for reporting the fare issue. The transaction details will need review. Please retain your ticket or card transaction record.",
      Hindi:
        "किराये की समस्या बताने के लिए धन्यवाद। लेन-देन के विवरण की समीक्षा आवश्यक है। कृपया टिकट या कार्ड लेन-देन रिकॉर्ड सुरक्षित रखें।",
      Gujarati:
        "ભાડાની સમસ્યા જણાવવા બદલ આભાર. વ્યવહારની વિગતોની સમીક્ષા જરૂરી છે. કૃપા કરીને ટિકિટ અથવા કાર્ડ ટ્રાન્ઝેક્શન રેકોર્ડ સાચવી રાખો.",
    },
    "Lifts & Escalators": {
      English:
        "Thank you for reporting the equipment fault. The station team has been asked to inspect it. Please use the nearest available alternative.",
      Hindi:
        "उपकरण की खराबी बताने के लिए धन्यवाद। स्टेशन टीम से इसकी जाँच करने को कहा गया है। कृपया निकटतम उपलब्ध विकल्प का उपयोग करें।",
      Gujarati:
        "ઉપકરણની ખામી જણાવવા બદલ આભાર. સ્ટેશન ટીમને તેની તપાસ કરવા જણાવાયું છે. કૃપા કરીને નજીકના ઉપલબ્ધ વિકલ્પનો ઉપયોગ કરો.",
    },
    "Staff Behaviour": {
      English:
        "Thank you for sharing your concern. The details have been recorded for an appropriate internal review.",
      Hindi:
        "अपनी चिंता साझा करने के लिए धन्यवाद। उचित आंतरिक समीक्षा के लिए विवरण दर्ज कर लिया गया है।",
      Gujarati:
        "તમારી ચિંતા જણાવવા બદલ આભાર. યોગ્ય આંતરિક સમીક્ષા માટે વિગતો નોંધવામાં આવી છે.",
    },
  }

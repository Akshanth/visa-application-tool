import { supabase } from '@/lib/supabase'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const OLLAMA_MODEL = 'llama3.2:3b'

const NATIONALITY_NAMES: Record<string, string> = {
  IN: 'Indian', AU: 'Australian', CA: 'Canadian', ID: 'Indonesian',
  PH: 'Filipino', SG: 'Singaporean', TH: 'Thai',
  GB: 'British', US: 'American', VN: 'Vietnamese',
}

export async function POST(req: Request) {
  const { messages, country, visaType: visaSlug, nationality } = await req.json()

  const { data: countryData } = await supabase
    .from('countries')
    .select('id, name')
    .eq('code', country)
    .single()

  if (!countryData) return new Response('Country not found', { status: 404 })

  const { data: visaData } = await supabase
    .from('visa_types')
    .select('id, name, official_url, last_verified_at')
    .eq('country_id', countryData.id)
    .eq('slug', visaSlug)
    .single()

  if (!visaData) return new Response('Visa type not found', { status: 404 })

  // Fetch requirements for this nationality + universal requirements (null nationality)
  const { data: requirements } = await supabase
    .from('requirements')
    .select('*')
    .eq('visa_type_id', visaData.id)
    .or(`applicant_nationality_code.eq.${nationality},applicant_nationality_code.is.null`)
    .order('category')

  // Group requirements by category for the system prompt
  const byCategory = (requirements ?? []).reduce<Record<string, typeof requirements>>((acc, req) => {
    if (!acc[req.category]) acc[req.category] = []
    acc[req.category]!.push(req)
    return acc
  }, {})

  const formattedRequirements = Object.entries(byCategory)
    .map(([category, reqs]) => {
      const items = reqs!.map(r =>
        `- **${r.document_name}** (${r.is_mandatory ? 'Mandatory' : 'Optional'}): ${r.description}${r.notes ? `\n  ⚠️ Note: ${r.notes}` : ''}`
      ).join('\n')
      return `### ${category}\n${items}`
    })
    .join('\n\n')

  const nationalityName = NATIONALITY_NAMES[nationality] ?? nationality
  const lastVerified = visaData.last_verified_at
    ? new Date(visaData.last_verified_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown'

  const systemPrompt = `You are VisaGuide, a friendly and expert visa application advisor. You help users navigate the visa application process with accurate, up-to-date guidance sourced from official embassy websites.

The user is applying for a **${visaData.name}** visa to **${countryData.name}** and holds a **${nationalityName}** passport.

## Official Requirements

${formattedRequirements.length > 0 ? formattedRequirements : 'No specific requirements found for this nationality.'}

**Source:** ${visaData.official_url}
**Last verified:** ${lastVerified}

## Guidelines
- Answer questions clearly and accurately, grounded only in the requirements listed above
- Proactively highlight important notes and common pitfalls applicants miss
- When asked for a checklist, use markdown checkboxes (- [ ]) grouped by category
- When asked to write documents (cover letter, itinerary), produce the full draft
- Always remind users to verify with the official embassy before applying, as requirements can change
- Be warm and reassuring — visa applications are stressful
- Never invent requirements not listed above; if something isn't covered, direct users to the official source`

  const ollamaMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const ollamaResponse = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages: ollamaMessages, stream: true }),
  })

  if (!ollamaResponse.ok || !ollamaResponse.body) {
    return new Response('Ollama error', { status: 500 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = ollamaResponse.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const json = JSON.parse(line)
            const text = json.message?.content
            if (text) controller.enqueue(encoder.encode(text))
          } catch {
            // skip malformed lines
          }
        }
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

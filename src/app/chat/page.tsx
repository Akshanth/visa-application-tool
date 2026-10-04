import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatInterface from '@/components/ChatInterface'

const NATIONALITY_NAMES: Record<string, string> = {
  IN: 'India', AU: 'Australia', CA: 'Canada', ID: 'Indonesia',
  PH: 'Philippines', SG: 'Singapore', TH: 'Thailand',
  GB: 'United Kingdom', US: 'United States', VN: 'Vietnam',
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; visa?: string; nationality?: string }>
}) {
  const { country, visa, nationality } = await searchParams

  if (!country || !visa || !nationality) redirect('/')

  const { data: countryData } = await supabase
    .from('countries')
    .select('id, name, flag_emoji')
    .eq('code', country)
    .single()

  if (!countryData) redirect('/')

  const { data: visaType } = await supabase
    .from('visa_types')
    .select('name')
    .eq('country_id', countryData.id)
    .eq('slug', visa)
    .single()

  if (!visaType) redirect('/')

  return (
    <ChatInterface
      country={country}
      visa={visa}
      nationality={nationality}
      visaName={visaType.name}
      countryName={countryData.name}
      countryFlag={countryData.flag_emoji ?? ''}
      nationalityName={NATIONALITY_NAMES[nationality] ?? nationality}
    />
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const NATIONALITIES = [
  { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
]

type Country = {
  id: string
  name: string
  code: string
  flag_emoji: string | null
}

type VisaType = {
  id: string
  name: string
  slug: string
}

export default function VisaSelector({ countries }: { countries: Country[] }) {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedVisa, setSelectedVisa] = useState('')
  const [selectedNationality, setSelectedNationality] = useState('')
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([])

  async function handleCountryChange(countryCode: unknown) {
    if (typeof countryCode !== 'string') return
    setSelectedCountry(countryCode)
    setSelectedVisa('')

    const country = countries.find(c => c.code === countryCode)
    if (!country) return

    const { data } = await supabase
      .from('visa_types')
      .select('id, name, slug')
      .eq('country_id', country.id)
      .order('name')

    setVisaTypes(data ?? [])
  }

  function handleSubmit() {
    if (!selectedCountry || !selectedVisa || !selectedNationality) return
    router.push(`/chat?country=${selectedCountry}&visa=${selectedVisa}&nationality=${selectedNationality}`)
  }

  const isComplete = selectedCountry && selectedVisa && selectedNationality

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-slate-800">Where are you planning to travel?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Destination country</label>
          <Select onValueChange={handleCountryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag_emoji} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Visa type</label>
          <Select
            disabled={!selectedCountry || visaTypes.length === 0}
            value={selectedVisa}
            onValueChange={(v) => { if (typeof v === 'string') setSelectedVisa(v) }}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedCountry ? 'Select visa type' : 'Select a country first'} />
            </SelectTrigger>
            <SelectContent>
              {visaTypes.map(v => (
                <SelectItem key={v.slug} value={v.slug}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Your nationality</label>
          <Select onValueChange={(v) => { if (typeof v === 'string') setSelectedNationality(v) }}>
            <SelectTrigger>
              <SelectValue placeholder="Select your nationality" />
            </SelectTrigger>
            <SelectContent>
              {NATIONALITIES.map(n => (
                <SelectItem key={n.code} value={n.code}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" disabled={!isComplete} onClick={handleSubmit}>
          Start my visa journey →
        </Button>

        <p className="text-xs text-slate-400 text-center">
          Currently supporting Japan tourist visa · More countries coming soon
        </p>
      </CardContent>
    </Card>
  )
}

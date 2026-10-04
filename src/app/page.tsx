import { supabase } from '@/lib/supabase'
import VisaSelector from '@/components/VisaSelector'

export default async function Home() {
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, code, flag_emoji')
    .order('name')

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">VisaGuide</h1>
          <p className="text-lg text-slate-500">Navigate your visa application with confidence</p>
        </div>
        <VisaSelector countries={countries ?? []} />
      </div>
    </main>
  )
}

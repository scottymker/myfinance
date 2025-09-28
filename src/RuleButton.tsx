import { supa } from "./lib/supabase"

export default function RuleButton({ userId, merchant, category }:{
  userId: string, merchant: string, category: string
}) {
  async function saveRule() {
    const { error } = await supa.from('merchant_rules').upsert(
      { user_id: userId, merchant, category },
      { onConflict: 'user_id,merchant' }
    )
    if (error) alert(error.message); else alert(`Rule saved: ${merchant} → ${category}`)
  }
  return (
    <button onClick={saveRule} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
      Save rule
    </button>
  )
}

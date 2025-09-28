import Subs from './Subs'
import SubscriptionsList from './SubscriptionsList'

export default function SubscriptionsPanel({ userId }: { userId: string }) {
  // One unified card: detector on top, manager below
  return (
    <div className="p-4 bg-white rounded-xl border">
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Subscriptions</h2>
        <Subs userId={userId} />
      </div>
      <div className="h-px bg-gray-200 my-4" />
      <SubscriptionsList userId={userId} />
    </div>
  )
}

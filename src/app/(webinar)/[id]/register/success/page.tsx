import Link from 'next/link'
import { DateTime } from 'luxon'
import { CheckCircle } from 'lucide-react'
import { getWebinar } from '@/webinar/service'

interface RegistrationSuccessProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        session_id: string
    }>
}

export default async function RegistrationSuccessPage(props: RegistrationSuccessProps) {

    const webinarId = (await props.params).id
    const sessionId = (await props.searchParams).session_id
    const webinar = await getWebinar(webinarId)
    const sessions = webinar.series?.flatMap((series) => series.sessions)
    const session = sessions?.find((session) => session.id === sessionId)



    if(!session) return null

  const formattedDate = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' }).toFormat("cccc, LLL d @ t ZZZZ")

  return (
    <div className="max-w-2xl mx-auto mt-16 px-6 text-center">
      <div className="flex flex-col items-center justify-center space-y-6">
        <CheckCircle className="h-16 w-16 text-green-600" />
        <h1 className="text-3xl font-semibold text-gray-800">You&apos;re Registered!</h1>
        <p className="text-md text-gray-600">
          You&apos;ve successfully registered for <span className="font-medium">{webinar.title}</span>.
        </p>
        <div className="bg-gray-100 p-4 rounded-md w-full text-left">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Session Time:</span> {formattedDate}
          </p>
          {webinar.presenters?.length > 0 && (
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-semibold">Hosted by:</span>{' '}
              {webinar.presenters.map((p, i) => (
                <span key={p.id}>
                  {p.name}
                  {i < webinar.presenters.length - 1 && ', '}
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="mt-6 space-x-4">
          <Link href="/">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
              Back to Home
            </button>
          </Link>
          <Link href={`/go/${session.id}`}>
            <button className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition">
              View Session
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

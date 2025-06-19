'use client'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Webinar } from '@webinar/service'
import { usePathname, useSearchParams } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { DateTime } from 'luxon'


interface WebinarCardProps {
  webinar: Webinar
  type?: 'upcoming' | 'past' | 'live'
}

export function WebinarCard({ webinar, type = 'upcoming' }: WebinarCardProps) {
  
  const sessions = webinar.series?.flatMap((series) => series.sessions)

  const thumbnail = webinar.media.find(
    (media) =>
      media.file_type === 'image' &&
      media.field_type === 'thumbnail'
  )

  const searchParams = useSearchParams()
  const pathname = usePathname()

  const navigateToDefaultWebinarRegistration = (id: string) => {
    const params = new URLSearchParams()
    const callbackUrl = `${pathname}?${searchParams.toString()}`
    params.set('callbackUrl', callbackUrl)
    return `/${id}/register?${params.toString()}`
  }

  return (
          <Card className="flex flex-col justify-between h-full min-h-[400px]">
          <Link href={navigateToDefaultWebinarRegistration(webinar.id)} className="block">
          <CardContent className="space-y-2 flex-1">
              <div className="relative w-full h-[150px] rounded overflow-hidden">
                  {thumbnail?.file_url ? (
                    <Image src={thumbnail.file_url} alt="Thumbnail" fill className="object-cover" />
                  ) : <Image src="/images/default-webinar-image.jpg" alt="Thumbnail" fill className="object-cover" />}
                </div>
              <CardTitle>{webinar.title}</CardTitle>
              <h2 className="text-sm text-muted-foreground">Internal Name - {webinar.name}</h2>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2 min-h-[3.5rem] leading-snug">
                  {webinar.description !== "" ? webinar.description : '\u00A0'}
              </p>
              {sessions?.map((session, index) => (
                <p key={`${session.id}-${index}`} className="text-xs hover:shadow-2xs pb-1">
                <Badge variant="outline">
                  {session.status}
                </Badge>{' '}
                {DateTime.fromISO(session.scheduled_start).toFormat("cccc, LLLL d'th', yyyy")}
              </p>
              ))}
              {type === 'past' && (
                <p className="text-xs mt-1 text-green-600">
                  {/* Replace with actual count when you have it */}
                  {/* {webinar.scheduled_start || 0} attendees */}
                </p>
              )}
            </CardContent>
          </Link>
          <Separator className="mt-auto" />
          <CardFooter className="flex justify-between items-center pt-2">
              <div className="text-xs text-muted-foreground line-clamp-1">
                {webinar.presenters.length > 0 ? (
                  webinar.presenters.map((speaker, index) => (
                    <span key={speaker.id}>
                      {speaker.name}
                      {index < webinar.presenters.length - 1 && ', '}
                    </span>
                  ))
                ) : (
                  <span className="italic">No speakers assigned</span>
                )}
              </div>
            <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Total Registered {sessions?.map((session) => session.attendees?.length).reduce((total, curr) => (total||0) + (curr||0), 0)}
                </Badge>
            </div>
          </CardFooter>
      </Card>

  )
}

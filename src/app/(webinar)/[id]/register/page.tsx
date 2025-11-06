import { getWebinar, registerForWebinar } from '@/webinar/service'
import { DefaultRegistrationForm } from './form'
import { NoAvailableSessionsMessage } from '@/webinar/components'
import Image from 'next/image'
import { Metadata } from 'next'

interface DefaultRegistrationPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        token: string
    }>
}

export async function generateMetadata({ params }: DefaultRegistrationPageProps): Promise<Metadata> {
    const webinarId = (await params).id
    const webinar = await getWebinar(webinarId)

  return {
    title: webinar.title ?? 'Webinar Registration',
    description: webinar.description ?? 'Register now to attend this exciting webinar session.',
    openGraph: {
      title: webinar.title,
      description: webinar.description,
      images: webinar.media
        ?.filter((m) => m.file_type === 'image' && m.field_type === 'thumbnail')
        .map((m) => ({ url: m.file_url })) ?? [],
    },
    twitter: {
      card: 'summary_large_image',
      title: webinar.title,
      description: webinar.description,
    },
  }
}

export default async function DefaultRegistrationPage(props: DefaultRegistrationPageProps) {
    
    const webinarId = (await props.params).id
    const webinar = await getWebinar(webinarId)
    const sessions = webinar.series?.flatMap((series) => series.sessions)

    const thumbnail = webinar.media.find(
        (media) =>
          media.file_type === 'image' &&
          media.field_type === 'thumbnail'
      )

  return (
    <div className='p-4'>
        <div className="relative w-full h-[150px] rounded overflow-hidden">
            {thumbnail?.file_url && (
            <Image src={thumbnail.file_url} alt="Thumbnail" fill className="object-cover" />
            )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{webinar.title}</h1>
        <p className="text-muted-foreground mb-4">{webinar.description}</p>

        {sessions && sessions[0] ? (
            <DefaultRegistrationForm webinar={webinar} registerAttendee={registerForWebinar}/>
        ) : <NoAvailableSessionsMessage />}
    </div>
  )
}

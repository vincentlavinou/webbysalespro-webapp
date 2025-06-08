import { getWebinar, registerForWebinar } from '@/webinar/service'
import { DefaultRegistrationForm } from './form'
import { UpcomingSessionBanner } from '@/webinar/components'
import Image from 'next/image'

interface DefaultRegistrationPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        token: string
    }>
}

export default async function DefaultRegistrationPage(props: DefaultRegistrationPageProps) {
    
    const webinarId = (await props.params).id
    const webinar = await getWebinar(webinarId)
    const thumbnail = webinar.media.find(
        (media) =>
          media.file_type === 'image' &&
          media.field_type === 'thumbnail'
      )

  return (
    <div className="max-w-xl mx-auto mt-10">
        <div className="relative w-full h-[150px] rounded overflow-hidden">
            {thumbnail?.file_url && (
            <Image src={thumbnail.file_url} alt="Thumbnail" fill className="object-cover" />
            )}
        </div>
        <h1 className="text-2xl font-bold mb-2">{webinar.title}</h1>
        <p className="text-muted-foreground mb-4">{webinar.description}</p>

        <DefaultRegistrationForm webinar={webinar} registerAttendee={registerForWebinar}/>
        {webinar.sessions && webinar.sessions[0] && <UpcomingSessionBanner session={webinar.sessions[0]}/>}
    </div>
  )
}
